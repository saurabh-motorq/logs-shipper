import * as Promise from 'bluebird';
import * as blobStorage from './blob-storage';
import { _ } from './lodash-mixins';

const committedBlocksForBlobCacheByContainer = {}

async function getCommittedBlocksForBlob(container, blobName) {
    if (_.isEmpty(committedBlocksForBlobCacheByContainer[container])) {
        committedBlocksForBlobCacheByContainer[container] = {};
    }
    if (_.isEmpty(committedBlocksForBlobCacheByContainer[container][blobName])) {
        const blocksInBlob = await blobStorage.getBlocksInBlob(container, blobName, "Committed")
        const committedBlocksInBlob = blocksInBlob.CommittedBlocks
        const committedBlockNamesInBlob = committedBlocksInBlob.map(committedBlock => committedBlock.Name)
        committedBlocksForBlobCacheByContainer[container][blobName] = committedBlockNamesInBlob
    }
    return committedBlocksForBlobCacheByContainer[container][blobName]
}

async function getNextBlockIdToCommitForBlob(container, blob) {
    const committedBlockIds = await getCommittedBlocksForBlob(container, blob)
    const lastCommittedBlockId = _.last(committedBlockIds)
    return _.isNil(lastCommittedBlockId) ? encodeBlockIndexAsString(1) : incrementBlockId(lastCommittedBlockId)
}

function incrementBlockId(blockId) {
    const nextBlockIndex = parseInt(blockId) + 1
    return encodeBlockIndexAsString(nextBlockIndex)
}

function encodeBlockIndexAsString(blockIndex) {
    return _.padStart(blockIndex, 5, "0") // 000XX
}

async function writeAndCommitDataToBlobs(container, blobContents) {
    const uncommittedBlockIdByBlob = await writeDataToBlobs(container, blobContents)
    const blobNames = blobContents.map(blobContent => blobContent.blobName)
    await commitBlockIdsToBlobs(container, blobNames, uncommittedBlockIdByBlob)
    updateBlocksCache(container, uncommittedBlockIdByBlob)
}

async function writeDataToBlobs(container, blobContents) { // writes data for multiple blobs as one new block per blob
    const uncommittedBlockIdByBlob = {}
    const writePromises = blobContents.map(async ({ blobName, blobContent }) => { // blobName should be unique. Need to modify if we want to write multiple blocks for a blob
        const generatedBlockId = await getNextBlockIdToCommitForBlob(container, blobName)
        uncommittedBlockIdByBlob[blobName] = generatedBlockId
        return blobStorage.writeBlockToBlob(container, blobName, generatedBlockId, blobContent)
    })
    await Promise.all(writePromises)
    return uncommittedBlockIdByBlob
}

async function commitBlockIdsToBlobs(container, blobs, uncommittedBlockIdByBlob) {
    const commitPromises = blobs.map(async (blob) => {
        const committedBlocks = await getCommittedBlocksForBlob(container, blob)
        const latestBlockList = committedBlocks.concat(uncommittedBlockIdByBlob[blob])
        return blobStorage.commitBlocks(container, blob, { LatestBlocks: latestBlockList })
    })
    await Promise.all(commitPromises)
}

function updateBlocksCache(container, uncommittedBlockIdByBlob) {
    Object.keys(uncommittedBlockIdByBlob).forEach(blob => {
        committedBlocksForBlobCacheByContainer[container][blob].push(uncommittedBlockIdByBlob[blob])
    })
}

export { writeAndCommitDataToBlobs };
