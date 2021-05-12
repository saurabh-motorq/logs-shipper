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
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAndCommitDataToBlobs = void 0;
const Promise = __importStar(require("bluebird"));
const blobStorage = __importStar(require("./blob-storage"));
const lodash_mixins_1 = require("./lodash-mixins");
const committedBlocksForBlobCacheByContainer = {};
async function getCommittedBlocksForBlob(container, blobName) {
    if (lodash_mixins_1._.isEmpty(committedBlocksForBlobCacheByContainer[container])) {
        committedBlocksForBlobCacheByContainer[container] = {};
    }
    if (lodash_mixins_1._.isEmpty(committedBlocksForBlobCacheByContainer[container][blobName])) {
        const blocksInBlob = await blobStorage.getBlocksInBlob(container, blobName, "Committed");
        const committedBlocksInBlob = blocksInBlob.CommittedBlocks;
        const committedBlockNamesInBlob = committedBlocksInBlob.map(committedBlock => committedBlock.Name);
        committedBlocksForBlobCacheByContainer[container][blobName] = committedBlockNamesInBlob;
    }
    return committedBlocksForBlobCacheByContainer[container][blobName];
}
async function getNextBlockIdToCommitForBlob(container, blob) {
    const committedBlockIds = await getCommittedBlocksForBlob(container, blob);
    const lastCommittedBlockId = lodash_mixins_1._.last(committedBlockIds);
    return lodash_mixins_1._.isNil(lastCommittedBlockId) ? encodeBlockIndexAsString(1) : incrementBlockId(lastCommittedBlockId);
}
function incrementBlockId(blockId) {
    const nextBlockIndex = parseInt(blockId) + 1;
    return encodeBlockIndexAsString(nextBlockIndex);
}
function encodeBlockIndexAsString(blockIndex) {
    return lodash_mixins_1._.padStart(blockIndex, 5, "0"); // 000XX
}
async function writeAndCommitDataToBlobs(container, blobContents) {
    const uncommittedBlockIdByBlob = await writeDataToBlobs(container, blobContents);
    const blobNames = blobContents.map(blobContent => blobContent.blobName);
    await commitBlockIdsToBlobs(container, blobNames, uncommittedBlockIdByBlob);
    updateBlocksCache(container, uncommittedBlockIdByBlob);
}
exports.writeAndCommitDataToBlobs = writeAndCommitDataToBlobs;
async function writeDataToBlobs(container, blobContents) {
    const uncommittedBlockIdByBlob = {};
    const writePromises = blobContents.map(async ({ blobName, blobContent }) => {
        const generatedBlockId = await getNextBlockIdToCommitForBlob(container, blobName);
        uncommittedBlockIdByBlob[blobName] = generatedBlockId;
        return blobStorage.writeBlockToBlob(container, blobName, generatedBlockId, blobContent);
    });
    await Promise.all(writePromises);
    return uncommittedBlockIdByBlob;
}
async function commitBlockIdsToBlobs(container, blobs, uncommittedBlockIdByBlob) {
    const commitPromises = blobs.map(async (blob) => {
        const committedBlocks = await getCommittedBlocksForBlob(container, blob);
        const latestBlockList = committedBlocks.concat(uncommittedBlockIdByBlob[blob]);
        return blobStorage.commitBlocks(container, blob, { LatestBlocks: latestBlockList });
    });
    await Promise.all(commitPromises);
}
function updateBlocksCache(container, uncommittedBlockIdByBlob) {
    Object.keys(uncommittedBlockIdByBlob).forEach(blob => {
        committedBlocksForBlobCacheByContainer[container][blob].push(uncommittedBlockIdByBlob[blob]);
    });
}
//# sourceMappingURL=blob-writer.js.map