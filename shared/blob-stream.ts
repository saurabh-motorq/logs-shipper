import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient, BlobClient, BlobGetPropertiesResponse } from "@azure/storage-blob"
import * as AzureStorageBlob from "@azure/storage-blob"
import { EventHubOutputStream } from "./event-hub-output-stream";
import { TableStorage } from "./table-storage";
const tableStorage = TableStorage.getDefaultInstance();
import config from "./config";
import stringHash from 'string-hash';
import * as _ from 'lodash';
import moment from 'moment';

class BlobStream {
    private accountName;
    private accountKey;
    private sharedKeyCredential: StorageSharedKeyCredential;
    private container;
    private containerClient: ContainerClient;
    private containerMarker: string;
    private blobClient: BlobClient;
    private folderPrefix;
    private fromDate;
    private blobServiceClient: BlobServiceClient;
    private eventHubOutputStream: EventHubOutputStream;
    private blobPropertiesMap: BlobPropertiesMap
    private uniqueBlobName: string


    constructor({ accountName, accountKey, container, folderPrefix, fromDate, eventHubOutputStream }) {
        this.accountName = accountName;
        this.accountKey = accountKey;
        this.container = container;
        this.folderPrefix = folderPrefix;
        this.fromDate = fromDate;
        this.eventHubOutputStream = eventHubOutputStream;
    }

    public async init() {
        this.sharedKeyCredential = new AzureStorageBlob.StorageSharedKeyCredential(this.accountName, this.accountKey);
        this.blobServiceClient = new AzureStorageBlob.BlobServiceClient(
            `https://${this.accountName}.blob.core.windows.net`,
            this.sharedKeyCredential
        );
        this.containerClient = this.blobServiceClient.getContainerClient(this.container);
        this.containerMarker = await this.getContainerMerker();
    }

    private async getContainerMerker() {
        let rowKey = `${this.accountName}-${this.folderPrefix}`
        rowKey = rowKey.replace(/\//g, '');
        const tableEntry = await tableStorage.getEntity(config.elkCheckpointTable, 'CONTAINERCHECKPOINT', rowKey);
        const data = tableEntry && tableEntry.data && tableStorage.getDataFromTableEntry(tableEntry);
        return data && data.marker
    }

    private async updateContainerMarker(marker) {
        let rowKey = `${this.accountName}-${this.folderPrefix}`;
        rowKey = rowKey.replace(/\//g, '');
        const tableEntry = tableStorage.createTableEntry('CONTAINERCHECKPOINT', rowKey, { data: JSON.stringify({ marker }) });
        await tableStorage.upsertEntityIntoTableStore(config.elkCheckpointTable, tableEntry);
        this.containerMarker = marker;
    }

    private async commitBlobOffset(blobName, offset) {
        const rowKey = blobName.replace(/\//g, '');
        const tableEntry = tableStorage.createTableEntry(this.accountName, rowKey, { data: JSON.stringify({ offset }) });
        await tableStorage.upsertEntityIntoTableStore(config.elkCheckpointTable, tableEntry);
    }

    public async getBlobContents() {
        this.containerMarker = await this.getContainerMerker();
        let marker = null;
        do {
            let lastProcessedBlob = null;
            const iterator = this.getBlobsFlat()
            let response = await iterator.next();
            marker = response.value.continuationToken;
            if (!response.done) {
                for (const blob of response.value.segment.blobItems) {
                    this.uniqueBlobName = `${this.accountName}-${this.folderPrefix}-${blob.name}`;
                    this.blobPropertiesMap[this.uniqueBlobName] = await this.blobClient.getProperties();
                    console.log(blob.name)
                    this.blobClient = this.containerClient.getBlobClient(blob.name);
                    if (await this.shouldUpdateContainerMarker(blob.name)){
                        await this.updateContainerMarker(marker);
                        continue;
                    }
                    else if (await this.shouldProcessBlob(blob.name)) {
                        await this.getBlobContentsAndPushToEh(blob.name);
                        lastProcessedBlob = blob.name
                    }
                }
            }
            if (marker && (!lastProcessedBlob || this.shouldUpdateContainerMarker(lastProcessedBlob))) {
                await this.updateContainerMarker(marker)
            }
        } while (marker);
    }

    private async shouldUpdateContainerMarker(blobName) {
        let properties = this.blobPropertiesMap[this.uniqueBlobName];
        const lastModified = properties.lastModified;
        const contentLength = properties.contentLength;
        const blobOffset = await this.getBlobOffset(blobName);
        if(moment().diff(lastModified,'m')>=60 && blobOffset>=contentLength){
            return true;
        }
    }

    private async getBlobContentsAndPushToEh(blobName) {
        let offset = 0;
        do {
            const blobContents = await this.getBlobContentsHelper(blobName);
            const { logArray, endOffset } = this.cleanBlobContent(blobContents);
            const partition = blobName === null ? "null" : stringHash(blobName) % config.elkEventHubPartitionCount;
            await this.eventHubOutputStream.sendBatch(logArray, partition);
            await this.commitBlobOffset(blobName, endOffset);
            offset = endOffset;
        } while (await this.isBlobUpdatedAfterLastRead(blobName, offset));
    }

    private cleanBlobContent(blobContents) {
        let logStrings = '';
        const logArray = [];
        let endOffset = (_.last(blobContents) as any).endOffset;
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

    private getBlobsFlat() {
        if (!this.containerMarker) {
            return this.containerClient.listBlobsFlat({ prefix: this.folderPrefix }).byPage({ maxPageSize: 5 });
        }
        else {
            return this.containerClient.listBlobsFlat({ prefix: this.folderPrefix }).byPage({ continuationToken: this.containerMarker, maxPageSize: 1 });
        }
    }

    private async shouldProcessBlob(blobName) {
        const parts = blobName.split('/');
        const webjobName = parts[0];
        const date = `${parts[1]}-${parts[2]}-${parts[3]}`;
        return _.includes(this.folderPrefix, webjobName) && moment(date).isSameOrAfter(this.fromDate) &&
        moment(this.fromDate).add(2,'w').isSameOrAfter(moment()) &&
        await this.isBlobUpdatedAfterLastRead(blobName);
    }

    private async isBlobUpdatedAfterLastRead(blobName, offset?) {
        const blobOffset = !_.isNil(offset) ? offset : await this.getBlobOffset(blobName);
        let blobProperties = this.blobPropertiesMap[this.uniqueBlobName];
        if (!blobProperties) {
            this.blobPropertiesMap[this.uniqueBlobName] = await this.blobClient.getProperties();
            blobProperties = this.blobPropertiesMap[this.uniqueBlobName];
        }
        const contentLength = blobProperties.contentLength;
        console.log(`Content length ${contentLength} blobOffset ${blobOffset}`)
        return (contentLength > parseInt(blobOffset)) && contentLength > 50000; // greater than 50kb. hacky fix. Update later
    }

    private async isLogFile(blobName) {
        const properties = await this.blobClient.getProperties();
        const lastModified = properties.lastModified;
        const contentLength = properties.contentLength;
        if (moment(lastModified).diff(moment(), 's') > 180 && contentLength <= 5000 ||
            moment(lastModified).diff(moment(), 's') > 900 && contentLength <= 50000) {
            console.log(`Ignoring Non log file - ${blobName}`)
            return false;
        }
        return true;
    }

    private async getBlobContentsHelper(blobName, offset?): Promise<getBlobContents[]> {
        const start = !_.isNil(offset) || await this.getBlobOffset(blobName);
        const response = await this.blobClient.download(start, 7500000, {
            blockSize: 4 * 1024 * 1024, // 4MB block size
            concurrency: 20, // 20 concurrency
        } as any);
        return await this.streamToString(response.readableStreamBody);
    }

    private async streamToString(readableStream): Promise<getBlobContents[]> {
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

    private async getBlobOffset(blobName: string) {
        const rowKey = blobName.replace(/\//g, '');
        const tableEntry = await tableStorage.getEntity(config.elkCheckpointTable, this.accountName, rowKey);
        const data = tableEntry && tableEntry.data && tableStorage.getDataFromTableEntry(tableEntry);
        return (data && data.offset) || 0;
    }

    public getInstance() {
        return this.containerClient
    }
}

interface getBlobContents {
    logString: string,
    endOffset: number
}

interface BlobPropertiesMap {
    [name: string]: BlobGetPropertiesResponse

}

export {
    BlobStream
}