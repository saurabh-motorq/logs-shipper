import {
	EventData, EventHubClient, EventPosition,
	ReceiveHandler, ReceiveOptions
} from "@azure/event-hubs";
import moment from 'moment';
import uuidV4 from "uuid/v4";
import config from "./config";
import { CheckpointerType, DocType, strings } from "./enums";
import { KeyValueCheckpointer } from "./key-value-checkpointer";
import { _ } from "./lodash-mixins";
import * as logger from "./logger";
import * as blobStorage from "shared/blob-storage";

class EventHubInputStream {
	private eventHubNamespace: string;
	private eventHub: string;
	private eventHubPartition: string;
	private eventHubFetchRate: number;
	private consumerGroup: string;
	private eventHubClient: EventHubClient;
	private receiveHandler: ReceiveHandler;
	private currentHandlerId: string;
	private stopped: boolean;
	private isFaultedState: boolean;
	private checkpointId: string;
	private keyValueCheckpointer: KeyValueCheckpointer;
	private checkpointerType: CheckpointerType;

	private messageBuffer: EventData[];
	private currentBatch: EventData[];
	private maxWaitingMessageCount: number;
	private lastMessageReceivedTime: string;
	private lastMessageSequenceNumber: number;
	private nextEnqueuedMessageCheckTime: string;
	private receiverCreatedTime: string;
	private shouldRestartIdleConn: boolean;
	private logPrefix: string;

	constructor({
		eventHubNamespace,
		eventHub,
		eventHubPartition,
		eventHubFetchRate,
		consumerGroup,
		checkpointId,
		checkpointerType,
		maxWaitingMessageCount
	}) {
		this.eventHubNamespace = eventHubNamespace;
		this.eventHub = eventHub;
		this.eventHubPartition = eventHubPartition;
		this.eventHubFetchRate = eventHubFetchRate;
		this.consumerGroup = consumerGroup;
		this.checkpointId = checkpointId;
		this.checkpointerType = checkpointerType;
		this.messageBuffer = [];
		this.currentBatch = [];
		this.maxWaitingMessageCount = maxWaitingMessageCount;
		this.stopped = false;
		this.logPrefix = `EVENTHUBINPUTSTREAM ${this.eventHub} ${this.eventHubPartition}`;
		this.eventHubClient = EventHubClient.createFromConnectionString(this.eventHubNamespace,
			this.eventHub);
		this.shouldRestartIdleConn = config.shouldRestartIdleEventHubConnection;
	}

	public async init() {

		if (this.checkpointerType === CheckpointerType.KeyValue) {
			this.keyValueCheckpointer = new KeyValueCheckpointer(this.checkpointId,"CHANGEFEEDPKRANGEID");
			await this.keyValueCheckpointer.init();
		}
		blobStorage.init(config.appBlobStorageConnectionString);
		await this.startReceiving();
	}

	public async getCurrentBatch() {
		await this.updateReceiving();
		if (!this.currentBatch.length) {
			this.spliceNextBatch();
		}
		await this.getLargeMessagesFromBlob();
		return this.currentBatch;
	}

	private async getLargeMessagesFromBlob() {
		for (let message of this.currentBatch) {
			if (message.body.blobContainer != null && message.body.blobName != null) {
				message.body = JSON.parse(await blobStorage.getBlobContents(message.body.blobContainer, message.body.blobName));
			}
		}
	}

	public async checkpointCurrentBatch() {
		if (this.checkpointerType !== CheckpointerType.KeyValue) {
			throw new Error(`checkpointCurrentBatch operation is supported only for CheckpointerType.KeyValue`);
		}
		if (!this.currentBatch.length) {
			return;
		}
		const lastMessage: EventData = _.last(this.currentBatch);
		await this.keyValueCheckpointer.checkpoint(lastMessage.offset, lastMessage.enqueuedTimeUtc);
		this.currentBatch = [];
	}

	public async getNextBatch() {
		await this.updateReceiving();
		this.spliceNextBatch();
		return this.currentBatch;
	}


	private async updateReceiving() {
		if (this.isBackPressureRequired() && !this.stopped) {
			await this.stopReceiving();
		}
		else if (!this.isBackPressureRequired() && this.stopped) {
			await this.startReceiving();
		} else if (await this.shouldRestart()) {
			await this.restartReceiving();
		}
	}

	private async spliceNextBatch() {
		this.currentBatch = this.messageBuffer.splice(0, this.eventHubFetchRate);
		this.trackOffsets();
	}

	private trackOffsets() {
		if (this.checkpointerType === CheckpointerType.ProcessedOffset) {
			const offsets = this.currentBatch.map(item => item.offset);
		}
	}

	private async startReceiving() {
		//resetting currentHanlderId as the first step,
		//so that we can ignore any unexpected messages from old handler
		const handlerId: string = uuidV4();
		this.currentHandlerId = handlerId;

		const fromOffset = await this.getFromOffset();

		const receiveOptions: ReceiveOptions = {
			eventPosition: EventPosition.fromOffset(fromOffset),
			consumerGroup: this.consumerGroup,
			prefetchCount: this.eventHubFetchRate
		}

		this.receiveHandler = this.eventHubClient.receive(this.eventHubPartition,
			(eventData) => this.onMessageHandler(eventData, handlerId),
			(error) => this.onErrorHandler(error, handlerId), receiveOptions);
		logger.trackTrace({
			message: `${this.logPrefix} - start receiving from offset: ${fromOffset}, handlerId:${this.currentHandlerId}`
		});
		this.receiverCreatedTime = moment().toISOString();
		this.isFaultedState = false;
		this.stopped = false;
	}

	private async getFromOffset() {
		// changing the order of getting offset from storage and in memory message could result in race condition
		// as the in memory messages could be updated when making the storage call
		const lastCheckpointedOffset = await this.getLastCheckpointedOffset();
		const lastMessage: EventData = _.last<EventData>(this.messageBuffer) || _.last<EventData>(this.currentBatch);
		let lastMessageOffset = null;
		if (lastMessage) {
			lastMessageOffset = lastMessage.offset;
		}
		const fromOffset = lastMessageOffset || lastCheckpointedOffset || "-1";
		return fromOffset;
	}

	private async restartReceiving() {
		await this.stopReceiving();
		await this.startReceiving();
		logger.trackTrace({ message: `${this.logPrefix} re-establishing eventhub connection ${this.eventHub}` });
	}

	private async getLastCheckpointedOffset() {
		let checkpointedOffset = null;
		if (this.checkpointerType === CheckpointerType.KeyValue) {
			const checkpoint = await this.keyValueCheckpointer.getLastCheckpoint();
			checkpointedOffset = checkpoint ? checkpoint.value : null;
		}
		return checkpointedOffset;
	}

	private onMessageHandler(eventData, handlerId) {
		if (this.currentHandlerId !== handlerId || this.stopped) {
			logger.trackTrace({
				message: `${this.logPrefix} received message from stopped eventhub receiver - handlerId:${handlerId}, currentHandlerId:${this.currentHandlerId}`
			});
			return;
		}
		this.messageBuffer.push(eventData);
		this.lastMessageReceivedTime = moment().toISOString();
		this.lastMessageSequenceNumber = eventData.sequenceNumber;
		if (this.isBackPressureRequired() && !this.stopped) {
			this.stopReceiving();
		}
	}

	private onErrorHandler(error, handlerId) {
		logger.trackException({ exception: error });
		logger.trackTrace({ message: `${this.logPrefix} error : ${error.name} ${error.message}` });
		if (!error.retryable && this.currentHandlerId === handlerId) {
			this.isFaultedState = true;
		}
	}

	private isBackPressureRequired(): boolean {
		return (this.messageBuffer.length + this.currentBatch.length) > this.maxWaitingMessageCount;
	}

	private async stopReceiving() {
		try {
			await this.receiveHandler.stop();
		} catch (error) {
			logger.trackException({ exception: error });
			logger.trackTrace({ message: `${this.logPrefix} error : ${error.name} ${error.message}` });
			// intentionally ignoring errors on stop, as we are going to create a new receive handler anyway
		}
		this.stopped = true;
		logger.trackTrace({ message: `${this.logPrefix} Stopped Receiving messages ${this.eventHub} - handler ${this.currentHandlerId}` })
	}

	private async shouldRestart(): Promise<boolean> {
		let result = false;
		const canQueryEventHub = _.isNil(this.nextEnqueuedMessageCheckTime) ||
			moment().isAfter(this.nextEnqueuedMessageCheckTime);
		if (this.isBackPressureRequired()) {
			result = false;
		} else if (this.isFaultedState) {
			result = true;
		} else if (this.isReceiverMaxIdleTimeElapsed() &&
			this.shouldRestartIdleConn &&
			canQueryEventHub
		) {
			const lastEnqueuedMessageSequenceNumber = await this.getLastEnqueuedMessageSequenceNumber();
			this.nextEnqueuedMessageCheckTime = moment().add(config.eventHubMaxIdleTimeMins, 'minutes').toISOString();
			const isMessageAvailableInEventHub = lastEnqueuedMessageSequenceNumber !== -1;
			result = isMessageAvailableInEventHub &&
				(_.isNil(lastEnqueuedMessageSequenceNumber) || lastEnqueuedMessageSequenceNumber !== this.lastMessageSequenceNumber);
		}
		return result;
	}

	private isReceiverMaxIdleTimeElapsed(): boolean {
		const isReceiverCreatedTimePastIdleTime = moment().isAfter(
			moment(this.receiverCreatedTime).add(config.eventHubMaxIdleTimeMins, "minutes")
		);
		const receiverMaxIdleTimeElapsed = (this.lastMessageReceivedTime &&
			moment().isAfter(
				moment(this.lastMessageReceivedTime).add(
					config.eventHubMaxIdleTimeMins, "minutes"
				)
			) && isReceiverCreatedTimePastIdleTime)
			|| (_.isNil(this.lastMessageReceivedTime) && isReceiverCreatedTimePastIdleTime);

		return receiverMaxIdleTimeElapsed;
	}

	private async getLastEnqueuedMessageSequenceNumber() {
		try {
			const partitionInfo = await this.eventHubClient.getPartitionInformation(this.eventHubPartition);
			logger.trackTrace({ message: `${this.logPrefix} lastMessageSequenceNumber : ${this.lastMessageSequenceNumber} lastEnqueuedMessageSequenceNumber${partitionInfo.lastSequenceNumber}` });
			return partitionInfo.lastSequenceNumber;
		} catch (error) {
			logger.trackException({ exception: error });
			logger.trackTrace({ message: `${this.logPrefix} error : ${error.name} ${error.message}` });
			// not critical to throw this error
		}
		return null;
	}
}

export { EventHubInputStream };

