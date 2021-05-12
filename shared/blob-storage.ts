/* tslint:disable:typedef */
// tslint:disable: tsr-detect-non-literal-fs-filename
import * as azureStorage from "azure-storage";
import * as Promise from "bluebird";
import * as fs from "fs";
import config from "./config";
import { BlobFetchType } from "./enums";

const retryOperations = new azureStorage.LinearRetryPolicyFilter(60, 10);
let blobService = getBlobService();

function init(connectionString) {
    blobService = getBlobService(connectionString);
}
function getBlobService(connectionString?) {
    let createdBlobService = null
    if (config.azureLocalStorage) {
        const devStoreCreds = azureStorage.generateDevelopmentStorageCredentials();
        createdBlobService = azureStorage.createBlobService(devStoreCreds).withFilter(retryOperations);
    } else {
        createdBlobService = azureStorage.createBlobService(connectionString).withFilter(retryOperations);
    }
    Promise.promisifyAll(createdBlobService);
    return createdBlobService;
}

async function createContainerIfNotExists(container: string) {
    await blobService.createContainerIfNotExistsAsync(container);
}

async function getBlocksInBlob(container: string, blob: string, listType: string) {
    const blockListType = listType || "ALL"
	const { exists } = await blobService.doesBlobExistAsync(container, blob)
    let blockListByBlockType = null
    if (!exists) {
        blockListByBlockType = {
            "CommittedBlocks": [],
            "UncommittedBlocks": [],
        }
    }
    else {
		blockListByBlockType = await blobService.listBlocksAsync(container, blob, blockListType)
    }
    return blockListByBlockType
}

async function writeBlobFromText(container: string, blob: string, content) {
    await blobService.createBlockBlobFromTextAsync(container, blob, content);
}

async function getBlobContents(container: string, blob: string, blobFetchType = BlobFetchType.Text) {
	let result;
	if(blobFetchType === BlobFetchType.Text) {
		result = await blobService.getBlobToTextAsync(container, blob);
	} else if(blobFetchType === BlobFetchType.Stream) {
		await blobService.getBlobToStreamAsync(container, blob, fs.createWriteStream(`${process.env.TMP}/input.txt`));
		result = fs.readFileSync(`${process.env.TMP}/input.txt`);
		fs.unlinkSync(`${process.env.TMP}/input.txt`);
	}
	return result;
}

async function commitBlocks(container: string, blob: string, blockList) {
    return await blobService.commitBlocksAsync(container, blob, blockList);
}

async function writeBlockToBlob(container, blob, blockId, content) {
    return await blobService.createBlockFromTextAsync(blockId, container, blob, content);
}

async function getBlobsWithPrefix(container, prefix) {
    const blobsWithGivenPrefix = [];
    let contToken = null;
    do {
        const response = await blobService.listBlobsSegmentedWithPrefixAsync(container, prefix, contToken);
        response.entries.forEach((blobResult) => {
            blobsWithGivenPrefix.push(blobResult.name);
        });
        contToken = response.continuationToken;
    } while (contToken);
    return blobsWithGivenPrefix;
}

async function writeDataToBlobs(container, blobNamesAndContents) { // overwrites contents to blobNames specified
    const writePromises = blobNamesAndContents.map(({ blobName, blobContent }) => {
        return writeBlobFromText(container, blobName, blobContent);
    });
    await Promise.all(writePromises);
}

async function readDataFromBlobs(container: string, blobNames: string[]) {
    const readPromises = blobNames.map((blobName) => {
        return getBlobContents(container, blobName);
    });
    const blobContents = await Promise.all(readPromises);
    return blobContents.map((content, index) => {
        return { blobName: blobNames[index], blobContent: content };
    });
}

function getWriteStreamForBlob(container: string, blobName: string) {
    return blobService.createWriteStreamToBlockBlob(container, blobName, { blockIdPrefix: 'block' })
}

export { createContainerIfNotExists, getBlocksInBlob, writeBlobFromText, getBlobContents, commitBlocks, writeBlockToBlob, getBlobsWithPrefix, writeDataToBlobs, readDataFromBlobs, getWriteStreamForBlob, init };
