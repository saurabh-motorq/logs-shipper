/* tslint:disable:typedef
tslint:disable tsr-detect-sql-literal-injection */
import config from './config';
import { EventHubClient } from "@azure/event-hubs";
import moment from 'moment';
import { _ } from "./lodash-mixins";
import * as logger from './logger';
import * as uuid from 'uuid/v4';
import * as blobStorage from "./blob-storage";
import * as blobWriter from "./blob-writer";
import { EventHubBatch } from './event-hub-batch';

class EventHubOutputStream {
	public id: string;
	public eventHubNamespace;
	public eventHub;
	public eventHubPartition;
	public eventHubClient;
	public largeMessageBlobContainer;

	constructor({
		id,
		eventHubNamespace,
		eventHub,
		eventHubPartition = null
	}) {
		this.id = id;
		this.eventHubNamespace = eventHubNamespace;
		this.eventHub = eventHub;
		this.eventHubPartition = eventHubPartition;
		this.largeMessageBlobContainer = `large-eventhub-message`
	}

	public async init() {
		this.eventHubClient = this.getEventHubClient();
		blobStorage.init(config.appBlobStorageConnectionString);
		await blobStorage.createContainerIfNotExists(this.largeMessageBlobContainer);
	}

	public getEventHubClient() {
		return EventHubClient.createFromConnectionString(this.eventHubNamespace,
			this.eventHub);
	}

	public async sendMessage(message) {
		if (_.isNil(this.eventHubPartition)) {
			throw new Error("Invalid event hub partition");
		}
		await this.eventHubClient.send({ "body": message }, this.eventHubPartition);
	}

	public async sendMessageToPartition(message, partition) {
		await this.sendBatch([message], partition);
	}

	public async sendBatch(messages: Array<any>, partition) {
		const items = _.clone(messages);
		while (items.length > 0) {
			const batch = new EventHubBatch(config.eventHubMsgSizeLimitBytes);
			while (items.length > 0) {
				const success = batch.tryAdd(items[0]);
				if (success) {
					items.shift();
				} else {
					break;
				}
			}

			if (batch.count >= 1) {
				const startTime = moment();
				await this.eventHubClient.sendBatch(batch.messages, partition);
				const timeTaken = moment().diff(startTime);
				logger.trackTrace({
					message:
						`Id: ${this.id}, Inserted ${batch.count} messages into eventHub partition ${partition} in ${timeTaken} milli seconds.}`
				});
				logger.trackTrace({ message: `EventhubIngress-${batch.count}` });

			} else if (items.length > 0 && batch.count == 0) { //single item exceeding the batch size
				items.shift();
				continue;
				const item = await this.writeMessageToBlob(items[0]);
				items[0] = item;
			}
		}
	}

	private async writeMessageToBlob(message) {
		const messageString = JSON.stringify(message);

		const blobName = `${this.eventHub}/${uuid()}.json`;
		const startTime = moment();

		await blobWriter.writeAndCommitDataToBlobs(this.largeMessageBlobContainer, [{ blobName, blobContent: messageString }]);
		const timeTaken = moment().diff(startTime);
		logger.trackTrace({
			message:
				`Id: ${this.id}, Inserted message into blob named ${blobName} in ${timeTaken} milli seconds. `
		});
		return { blobContainer: this.largeMessageBlobContainer, blobName };
	}
}

export { EventHubOutputStream };

