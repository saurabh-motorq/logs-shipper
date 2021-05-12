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
exports.EventHubOutputStream = void 0;
/* tslint:disable:typedef
tslint:disable tsr-detect-sql-literal-injection */
const config_1 = __importDefault(require("./config"));
const event_hubs_1 = require("@azure/event-hubs");
const moment_1 = __importDefault(require("moment"));
const lodash_mixins_1 = require("./lodash-mixins");
const logger = __importStar(require("./logger"));
const uuid = __importStar(require("uuid/v4"));
const blobStorage = __importStar(require("./blob-storage"));
const blobWriter = __importStar(require("./blob-writer"));
const event_hub_batch_1 = require("./event-hub-batch");
class EventHubOutputStream {
    constructor({ id, eventHubNamespace, eventHub, eventHubPartition = null }) {
        this.id = id;
        this.eventHubNamespace = eventHubNamespace;
        this.eventHub = eventHub;
        this.eventHubPartition = eventHubPartition;
        this.largeMessageBlobContainer = `large-eventhub-message`;
    }
    async init() {
        this.eventHubClient = this.getEventHubClient();
        blobStorage.init(config_1.default.appBlobStorageConnectionString);
        await blobStorage.createContainerIfNotExists(this.largeMessageBlobContainer);
    }
    getEventHubClient() {
        return event_hubs_1.EventHubClient.createFromConnectionString(this.eventHubNamespace, this.eventHub);
    }
    async sendMessage(message) {
        if (lodash_mixins_1._.isNil(this.eventHubPartition)) {
            throw new Error("Invalid event hub partition");
        }
        await this.eventHubClient.send({ "body": message }, this.eventHubPartition);
    }
    async sendMessageToPartition(message, partition) {
        await this.sendBatch([message], partition);
    }
    async sendBatch(messages, partition) {
        const items = lodash_mixins_1._.clone(messages);
        while (items.length > 0) {
            const batch = new event_hub_batch_1.EventHubBatch(config_1.default.eventHubMsgSizeLimitBytes);
            while (items.length > 0) {
                const success = batch.tryAdd(items[0]);
                if (success) {
                    items.shift();
                }
                else {
                    break;
                }
            }
            if (batch.count >= 1) {
                const startTime = moment_1.default();
                await this.eventHubClient.sendBatch(batch.messages, partition);
                const timeTaken = moment_1.default().diff(startTime);
                logger.trackTrace({
                    message: `Id: ${this.id}, Inserted ${batch.count} messages into eventHub partition ${partition} in ${timeTaken} milli seconds.}`
                });
                logger.trackTrace({ message: `EventhubIngress-${batch.count}` });
            }
            else if (items.length > 0 && batch.count == 0) { //single item exceeding the batch size
                items.shift();
                continue;
                const item = await this.writeMessageToBlob(items[0]);
                items[0] = item;
            }
        }
    }
    async writeMessageToBlob(message) {
        const messageString = JSON.stringify(message);
        const blobName = `${this.eventHub}/${uuid()}.json`;
        const startTime = moment_1.default();
        await blobWriter.writeAndCommitDataToBlobs(this.largeMessageBlobContainer, [{ blobName, blobContent: messageString }]);
        const timeTaken = moment_1.default().diff(startTime);
        logger.trackTrace({
            message: `Id: ${this.id}, Inserted message into blob named ${blobName} in ${timeTaken} milli seconds. `
        });
        return { blobContainer: this.largeMessageBlobContainer, blobName };
    }
}
exports.EventHubOutputStream = EventHubOutputStream;
//# sourceMappingURL=event-hub-output-stream.js.map