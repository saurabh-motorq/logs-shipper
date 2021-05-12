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
exports.BlobStream = void 0;
const AzureStorageBlob = __importStar(require("@azure/storage-blob"));
const table_storage_1 = require("./table-storage");
const tableStorage = table_storage_1.TableStorage.getDefaultInstance();
const config_1 = __importDefault(require("./config"));
const string_hash_1 = __importDefault(require("string-hash"));
const _ = __importStar(require("lodash"));
const moment_1 = __importDefault(require("moment"));
class BlobStream {
    constructor({ accountName, accountKey, container, folderPrefix, fromDate, eventHubOutputStream }) {
        this.accountName = accountName;
        this.accountKey = accountKey;
        this.container = container;
        this.folderPrefix = folderPrefix;
        this.fromDate = fromDate;
        this.eventHubOutputStream = eventHubOutputStream;
    }
    async init() {
        this.sharedKeyCredential = new AzureStorageBlob.StorageSharedKeyCredential(this.accountName, this.accountKey);
        this.blobServiceClient = new AzureStorageBlob.BlobServiceClient(`https://${this.accountName}.blob.core.windows.net`, this.sharedKeyCredential);
        this.containerClient = this.blobServiceClient.getContainerClient(this.container);
        this.containerMarker = await this.getContainerMerker();
    }
    async getContainerMerker() {
        let rowKey = `${this.accountName}-${this.folderPrefix}`;
        rowKey = rowKey.replace(/\//g, '');
        const tableEntry = await tableStorage.getEntity(config_1.default.elkCheckpointTable, 'CONTAINERCHECKPOINT', rowKey);
        const data = tableEntry && tableEntry.data && tableStorage.getDataFromTableEntry(tableEntry);
        return data && data.marker;
    }
    async updateContainerMarker(marker) {
        let rowKey = `${this.accountName}-${this.folderPrefix}`;
        rowKey = rowKey.replace(/\//g, '');
        const tableEntry = tableStorage.createTableEntry('CONTAINERCHECKPOINT', rowKey, { data: JSON.stringify({ marker }) });
        await tableStorage.upsertEntityIntoTableStore(config_1.default.elkCheckpointTable, tableEntry);
        this.containerMarker = marker;
    }
    async commitBlobOffset(blobName, offset) {
        const rowKey = blobName.replace(/\//g, '');
        const tableEntry = tableStorage.createTableEntry(this.accountName, rowKey, { data: JSON.stringify({ offset }) });
        await tableStorage.upsertEntityIntoTableStore(config_1.default.elkCheckpointTable, tableEntry);
    }
    async getBlobContents() {
        this.containerMarker = await this.getContainerMerker();
        let marker = null;
        do {
            let lastProcessedBlob = null;
            const iterator = this.getBlobsFlat();
            let response = await iterator.next();
            marker = response.value.continuationToken;
            if (!response.done) {
                for (const blob of response.value.segment.blobItems) {
                    this.uniqueBlobName = `${this.accountName}-${this.folderPrefix}-${blob.name}`;
                    this.blobPropertiesMap[this.uniqueBlobName] = await this.blobClient.getProperties();
                    console.log(blob.name);
                    this.blobClient = this.containerClient.getBlobClient(blob.name);
                    if (await this.shouldUpdateContainerMarker(blob.name)) {
                        await this.updateContainerMarker(marker);
                        continue;
                    }
                    else if (await this.shouldProcessBlob(blob.name)) {
                        await this.getBlobContentsAndPushToEh(blob.name);
                        lastProcessedBlob = blob.name;
                    }
                }
            }
            if (marker && (!lastProcessedBlob || this.shouldUpdateContainerMarker(lastProcessedBlob))) {
                await this.updateContainerMarker(marker);
            }
        } while (marker);
    }
    async shouldUpdateContainerMarker(blobName) {
        let properties = this.blobPropertiesMap[this.uniqueBlobName];
        const lastModified = properties.lastModified;
        const contentLength = properties.contentLength;
        const blobOffset = await this.getBlobOffset(blobName);
        if (moment_1.default().diff(lastModified, 'm') >= 60 && blobOffset >= contentLength) {
            return true;
        }
    }
    async getBlobContentsAndPushToEh(blobName) {
        let offset = 0;
        do {
            const blobContents = await this.getBlobContentsHelper(blobName);
            const { logArray, endOffset } = this.cleanBlobContent(blobContents);
            const partition = blobName === null ? "null" : string_hash_1.default(blobName) % config_1.default.elkEventHubPartitionCount;
            await this.eventHubOutputStream.sendBatch(logArray, partition);
            await this.commitBlobOffset(blobName, endOffset);
            offset = endOffset;
        } while (await this.isBlobUpdatedAfterLastRead(blobName, offset));
    }
    cleanBlobContent(blobContents) {
        let logStrings = '';
        const logArray = [];
        let endOffset = _.last(blobContents).endOffset;
        for (const blobContent of blobContents) {
            logStrings += blobContent.logString;
        }
        for (let logString of logStrings.split('\r\n')) {
            logArray.push(logString);
        }
        const lastLog = _.last(logArray);
        if (!lastLog.endsWith('""}",')) {
            endOffset -= lastLog.length;
        }
        return { logArray, endOffset };
    }
    getBlobsFlat() {
        if (!this.containerMarker) {
            return this.containerClient.listBlobsFlat({ prefix: this.folderPrefix }).byPage({ maxPageSize: 5 });
        }
        else {
            return this.containerClient.listBlobsFlat({ prefix: this.folderPrefix }).byPage({ continuationToken: this.containerMarker, maxPageSize: 1 });
        }
    }
    async shouldProcessBlob(blobName) {
        const parts = blobName.split('/');
        const webjobName = parts[0];
        const date = `${parts[1]}-${parts[2]}-${parts[3]}`;
        return _.includes(this.folderPrefix, webjobName) && moment_1.default(date).isSameOrAfter(this.fromDate) &&
            moment_1.default(this.fromDate).add(2, 'w').isSameOrAfter(moment_1.default()) &&
            await this.isBlobUpdatedAfterLastRead(blobName);
    }
    async isBlobUpdatedAfterLastRead(blobName, offset) {
        const blobOffset = !_.isNil(offset) ? offset : await this.getBlobOffset(blobName);
        let blobProperties = this.blobPropertiesMap[this.uniqueBlobName];
        if (!blobProperties) {
            this.blobPropertiesMap[this.uniqueBlobName] = await this.blobClient.getProperties();
            blobProperties = this.blobPropertiesMap[this.uniqueBlobName];
        }
        const contentLength = blobProperties.contentLength;
        console.log(`Content length ${contentLength} blobOffset ${blobOffset}`);
        return (contentLength > parseInt(blobOffset)) && contentLength > 50000; // greater than 50kb. hacky fix. Update later
    }
    async isLogFile(blobName) {
        const properties = await this.blobClient.getProperties();
        const lastModified = properties.lastModified;
        const contentLength = properties.contentLength;
        if (moment_1.default(lastModified).diff(moment_1.default(), 's') > 180 && contentLength <= 5000 ||
            moment_1.default(lastModified).diff(moment_1.default(), 's') > 900 && contentLength <= 50000) {
            console.log(`Ignoring Non log file - ${blobName}`);
            return false;
        }
        return true;
    }
    async getBlobContentsHelper(blobName, offset) {
        const start = !_.isNil(offset) || await this.getBlobOffset(blobName);
        const response = await this.blobClient.download(start, 7500000, {
            blockSize: 4 * 1024 * 1024,
            concurrency: 20, // 20 concurrency
        });
        return await this.streamToString(response.readableStreamBody);
    }
    async streamToString(readableStream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            readableStream.on("data", (data) => {
                const logString = data.toString();
                const endOffset = readableStream.offset;
                chunks.push({ logString, endOffset });
            });
            readableStream.on("end", () => {
                resolve(chunks);
            });
            readableStream.on("error", reject);
        });
    }
    async getBlobOffset(blobName) {
        const rowKey = blobName.replace(/\//g, '');
        const tableEntry = await tableStorage.getEntity(config_1.default.elkCheckpointTable, this.accountName, rowKey);
        const data = tableEntry && tableEntry.data && tableStorage.getDataFromTableEntry(tableEntry);
        return (data && data.offset) || 0;
    }
    getInstance() {
        return this.containerClient;
    }
}
exports.BlobStream = BlobStream;
//# sourceMappingURL=blob-stream.js.map