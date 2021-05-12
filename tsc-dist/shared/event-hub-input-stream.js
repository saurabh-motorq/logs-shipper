"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHubInputStream = void 0;
const event_hubs_1 = require("@azure/event-hubs");
const moment_1 = __importDefault(require("moment"));
const v4_1 = __importDefault(require("uuid/v4"));
const config_1 = __importDefault(require("./config"));
const enums_1 = require("./enums");
const key_value_checkpointer_1 = require("./key-value-checkpointer");
const lodash_mixins_1 = require("./lodash-mixins");
const logger = __importStar(require("./logger"));
const blobStorage = __importStar(require("shared/blob-storage"));
class EventHubInputStream {
    constructor({ eventHubNamespace, eventHub, eventHubPartition, eventHubFetchRate, consumerGroup, checkpointId, checkpointerType, maxWaitingMessageCount }) {
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
        this.eventHubClient = event_hubs_1.EventHubClient.createFromConnectionString(this.eventHubNamespace, this.eventHub);
        this.shouldRestartIdleConn = config_1.default.shouldRestartIdleEventHubConnection;
    }
    async init() {
        if (this.checkpointerType === enums_1.CheckpointerType.KeyValue) {
            this.keyValueCheckpointer = new key_value_checkpointer_1.KeyValueCheckpointer(this.checkpointId, "CHANGEFEEDPKRANGEID");
            await this.keyValueCheckpointer.init();
        }
        blobStorage.init(config_1.default.appBlobStorageConnectionString);
        await this.startReceiving();
    }
    async getCurrentBatch() {
        await this.updateReceiving();
        if (!this.currentBatch.length) {
            this.spliceNextBatch();
        }
        await this.getLargeMessagesFromBlob();
        return this.currentBatch;
    }
    async getLargeMessagesFromBlob() {
        for (let message of this.currentBatch) {
            if (message.body.blobContainer != null && message.body.blobName != null) {
                message.body = JSON.parse(await blobStorage.getBlobContents(message.body.blobContainer, message.body.blobName));
            }
        }
    }
    async checkpointCurrentBatch() {
        if (this.checkpointerType !== enums_1.CheckpointerType.KeyValue) {
            throw new Error(`checkpointCurrentBatch operation is supported only for CheckpointerType.KeyValue`);
        }
        if (!this.currentBatch.length) {
            return;
        }
        const lastMessage = lodash_mixins_1._.last(this.currentBatch);
        await this.keyValueCheckpointer.checkpoint(lastMessage.offset, lastMessage.enqueuedTimeUtc);
        this.currentBatch = [];
    }
    async getNextBatch() {
        await this.updateReceiving();
        this.spliceNextBatch();
        return this.currentBatch;
    }
    async updateReceiving() {
        if (this.isBackPressureRequired() && !this.stopped) {
            await this.stopReceiving();
        }
        else if (!this.isBackPressureRequired() && this.stopped) {
            await this.startReceiving();
        }
        else if (await this.shouldRestart()) {
            await this.restartReceiving();
        }
    }
    async spliceNextBatch() {
        this.currentBatch = this.messageBuffer.splice(0, this.eventHubFetchRate);
        this.trackOffsets();
    }
    trackOffsets() {
        if (this.checkpointerType === enums_1.CheckpointerType.ProcessedOffset) {
            const offsets = this.currentBatch.map(item => item.offset);
        }
    }
    async startReceiving() {
        //resetting currentHanlderId as the first step,
        //so that we can ignore any unexpected messages from old handler
        const handlerId = v4_1.default();
        this.currentHandlerId = handlerId;
        const fromOffset = await this.getFromOffset();
        const receiveOptions = {
            eventPosition: event_hubs_1.EventPosition.fromOffset(fromOffset),
            consumerGroup: this.consumerGroup,
            prefetchCount: this.eventHubFetchRate
        };
        this.receiveHandler = this.eventHubClient.receive(this.eventHubPartition, (eventData) => this.onMessageHandler(eventData, handlerId), (error) => this.onErrorHandler(error, handlerId), receiveOptions);
        logger.trackTrace({
            message: `${this.logPrefix} - start receiving from offset: ${fromOffset}, handlerId:${this.currentHandlerId}`
        });
        this.receiverCreatedTime = moment_1.default().toISOString();
        this.isFaultedState = false;
        this.stopped = false;
    }
    async getFromOffset() {
        // changing the order of getting offset from storage and in memory message could result in race condition
        // as the in memory messages could be updated when making the storage call
        const lastCheckpointedOffset = await this.getLastCheckpointedOffset();
        const lastMessage = lodash_mixins_1._.last(this.messageBuffer) || lodash_mixins_1._.last(this.currentBatch);
        let lastMessageOffset = null;
        if (lastMessage) {
            lastMessageOffset = lastMessage.offset;
        }
        const fromOffset = lastMessageOffset || lastCheckpointedOffset || "-1";
        return fromOffset;
    }
    async restartReceiving() {
        await this.stopReceiving();
        await this.startReceiving();
        logger.trackTrace({ message: `${this.logPrefix} re-establishing eventhub connection ${this.eventHub}` });
    }
    async getLastCheckpointedOffset() {
        let checkpointedOffset = null;
        if (this.checkpointerType === enums_1.CheckpointerType.KeyValue) {
            const checkpoint = await this.keyValueCheckpointer.getLastCheckpoint();
            checkpointedOffset = checkpoint ? checkpoint.value : null;
        }
        return checkpointedOffset;
    }
    onMessageHandler(eventData, handlerId) {
        if (this.currentHandlerId !== handlerId || this.stopped) {
            logger.trackTrace({
                message: `${this.logPrefix} received message from stopped eventhub receiver - handlerId:${handlerId}, currentHandlerId:${this.currentHandlerId}`
            });
            return;
        }
        this.messageBuffer.push(eventData);
        this.lastMessageReceivedTime = moment_1.default().toISOString();
        this.lastMessageSequenceNumber = eventData.sequenceNumber;
        if (this.isBackPressureRequired() && !this.stopped) {
            this.stopReceiving();
        }
    }
    onErrorHandler(error, handlerId) {
        logger.trackException({ exception: error });
        logger.trackTrace({ message: `${this.logPrefix} error : ${error.name} ${error.message}` });
        if (!error.retryable && this.currentHandlerId === handlerId) {
            this.isFaultedState = true;
        }
    }
    isBackPressureRequired() {
        return (this.messageBuffer.length + this.currentBatch.length) > this.maxWaitingMessageCount;
    }
    async stopReceiving() {
        try {
            await this.receiveHandler.stop();
        }
        catch (error) {
            logger.trackException({ exception: error });
            logger.trackTrace({ message: `${this.logPrefix} error : ${error.name} ${error.message}` });
            // intentionally ignoring errors on stop, as we are going to create a new receive handler anyway
        }
        this.stopped = true;
        logger.trackTrace({ message: `${this.logPrefix} Stopped Receiving messages ${this.eventHub} - handler ${this.currentHandlerId}` });
    }
    async shouldRestart() {
        let result = false;
        const canQueryEventHub = lodash_mixins_1._.isNil(this.nextEnqueuedMessageCheckTime) ||
            moment_1.default().isAfter(this.nextEnqueuedMessageCheckTime);
        if (this.isBackPressureRequired()) {
            result = false;
        }
        else if (this.isFaultedState) {
            result = true;
        }
        else if (this.isReceiverMaxIdleTimeElapsed() &&
            this.shouldRestartIdleConn &&
            canQueryEventHub) {
            const lastEnqueuedMessageSequenceNumber = await this.getLastEnqueuedMessageSequenceNumber();
            this.nextEnqueuedMessageCheckTime = moment_1.default().add(config_1.default.eventHubMaxIdleTimeMins, 'minutes').toISOString();
            const isMessageAvailableInEventHub = lastEnqueuedMessageSequenceNumber !== -1;
            result = isMessageAvailableInEventHub &&
                (lodash_mixins_1._.isNil(lastEnqueuedMessageSequenceNumber) || lastEnqueuedMessageSequenceNumber !== this.lastMessageSequenceNumber);
        }
        return result;
    }
    isReceiverMaxIdleTimeElapsed() {
        const isReceiverCreatedTimePastIdleTime = moment_1.default().isAfter(moment_1.default(this.receiverCreatedTime).add(config_1.default.eventHubMaxIdleTimeMins, "minutes"));
        const receiverMaxIdleTimeElapsed = (this.lastMessageReceivedTime &&
            moment_1.default().isAfter(moment_1.default(this.lastMessageReceivedTime).add(config_1.default.eventHubMaxIdleTimeMins, "minutes")) && isReceiverCreatedTimePastIdleTime)
            || (lodash_mixins_1._.isNil(this.lastMessageReceivedTime) && isReceiverCreatedTimePastIdleTime);
        return receiverMaxIdleTimeElapsed;
    }
    async getLastEnqueuedMessageSequenceNumber() {
        try {
            const partitionInfo = await this.eventHubClient.getPartitionInformation(this.eventHubPartition);
            logger.trackTrace({ message: `${this.logPrefix} lastMessageSequenceNumber : ${this.lastMessageSequenceNumber} lastEnqueuedMessageSequenceNumber${partitionInfo.lastSequenceNumber}` });
            return partitionInfo.lastSequenceNumber;
        }
        catch (error) {
            logger.trackException({ exception: error });
            logger.trackTrace({ message: `${this.logPrefix} error : ${error.name} ${error.message}` });
            // not critical to throw this error
        }
        return null;
    }
}
exports.EventHubInputStream = EventHubInputStream;
//# sourceMappingURL=event-hub-input-stream.js.map