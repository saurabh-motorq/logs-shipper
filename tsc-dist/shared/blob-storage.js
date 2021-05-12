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
exports.init = exports.getWriteStreamForBlob = exports.readDataFromBlobs = exports.writeDataToBlobs = exports.getBlobsWithPrefix = exports.writeBlockToBlob = exports.commitBlocks = exports.getBlobContents = exports.writeBlobFromText = exports.getBlocksInBlob = exports.createContainerIfNotExists = void 0;
/* tslint:disable:typedef */
// tslint:disable: tsr-detect-non-literal-fs-filename
const azureStorage = __importStar(require("azure-storage"));
const Promise = __importStar(require("bluebird"));
const fs = __importStar(require("fs"));
const config_1 = __importDefault(require("./config"));
const enums_1 = require("./enums");
const retryOperations = new azureStorage.LinearRetryPolicyFilter(60, 10);
let blobService = getBlobService();
function init(connectionString) {
    blobService = getBlobService(connectionString);
}
exports.init = init;
function getBlobService(connectionString) {
    let createdBlobService = null;
    if (config_1.default.azureLocalStorage) {
        const devStoreCreds = azureStorage.generateDevelopmentStorageCredentials();
        createdBlobService = azureStorage.createBlobService(devStoreCreds).withFilter(retryOperations);
    }
    else {
        createdBlobService = azureStorage.createBlobService(connectionString).withFilter(retryOperations);
    }
    Promise.promisifyAll(createdBlobService);
    return createdBlobService;
}
async function createContainerIfNotExists(container) {
    await blobService.createContainerIfNotExistsAsync(container);
}
exports.createContainerIfNotExists = createContainerIfNotExists;
async function getBlocksInBlob(container, blob, listType) {
    const blockListType = listType || "ALL";
    const { exists } = await blobService.doesBlobExistAsync(container, blob);
    let blockListByBlockType = null;
    if (!exists) {
        blockListByBlockType = {
            "CommittedBlocks": [],
            "UncommittedBlocks": [],
        };
    }
    else {
        blockListByBlockType = await blobService.listBlocksAsync(container, blob, blockListType);
    }
    return blockListByBlockType;
}
exports.getBlocksInBlob = getBlocksInBlob;
async function writeBlobFromText(container, blob, content) {
    await blobService.createBlockBlobFromTextAsync(container, blob, content);
}
exports.writeBlobFromText = writeBlobFromText;
async function getBlobContents(container, blob, blobFetchType = enums_1.BlobFetchType.Text) {
    let result;
    if (blobFetchType === enums_1.BlobFetchType.Text) {
        result = await blobService.getBlobToTextAsync(container, blob);
    }
    else if (blobFetchType === enums_1.BlobFetchType.Stream) {
        await blobService.getBlobToStreamAsync(container, blob, fs.createWriteStream(`${process.env.TMP}/input.txt`));
        result = fs.readFileSync(`${process.env.TMP}/input.txt`);
        fs.unlinkSync(`${process.env.TMP}/input.txt`);
    }
    return result;
}
exports.getBlobContents = getBlobContents;
async function commitBlocks(container, blob, blockList) {
    return await blobService.commitBlocksAsync(container, blob, blockList);
}
exports.commitBlocks = commitBlocks;
async function writeBlockToBlob(container, blob, blockId, content) {
    return await blobService.createBlockFromTextAsync(blockId, container, blob, content);
}
exports.writeBlockToBlob = writeBlockToBlob;
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
exports.getBlobsWithPrefix = getBlobsWithPrefix;
async function writeDataToBlobs(container, blobNamesAndContents) {
    const writePromises = blobNamesAndContents.map(({ blobName, blobContent }) => {
        return writeBlobFromText(container, blobName, blobContent);
    });
    await Promise.all(writePromises);
}
exports.writeDataToBlobs = writeDataToBlobs;
async function readDataFromBlobs(container, blobNames) {
    const readPromises = blobNames.map((blobName) => {
        return getBlobContents(container, blobName);
    });
    const blobContents = await Promise.all(readPromises);
    return blobContents.map((content, index) => {
        return { blobName: blobNames[index], blobContent: content };
    });
}
exports.readDataFromBlobs = readDataFromBlobs;
function getWriteStreamForBlob(container, blobName) {
    return blobService.createWriteStreamToBlockBlob(container, blobName, { blockIdPrefix: 'block' });
}
exports.getWriteStreamForBlob = getWriteStreamForBlob;
//# sourceMappingURL=blob-storage.js.map