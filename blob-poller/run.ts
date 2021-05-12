import config from "../shared/config";
import * as fs from "fs";
import { TableStorage } from "../shared/table-storage";
import { EventHubOutputStream } from "../shared/event-hub-output-stream";
import { BlobStream } from '../shared/blob-stream';
import * as logger from "../shared/logger";
const tableStorage = TableStorage.getDefaultInstance();
import { envConfig } from "./envConfigs";
import bottleneck from "bottleneck";
import * as timers from "timers";

let mutexlimiter = null;
const promises = [];
function getMutexLimiter() {
    const limiter = new bottleneck({
        maxConcurrent: 1
    });
    limiter.on("error", (error) => {
        logger.trackEvent({ name: "Bottleneck error" });
        logger.trackException({ exception: error });
    });
    return limiter;
}

async function run(instanceId) {
    logger.trackEvent({ name: "Application started" });
    try {
        logger.trackTrace({ message: `Application started` });
        await init(instanceId);
        repeatFetchAndProcess();
    } catch (error) {
        logger.trackException({ exception: error });
        process.exit(0);
    }
}


async function init(instanceId) {
    for (const blobConfig of envConfig.blobConfigs) {
        if(parseInt(instanceId) != blobConfig.instanceId){
            continue;
        }
        for (const folderPrefix of blobConfig.folderPrefixes) {
            const eventHubOutputStream = new EventHubOutputStream({
                id: 'logs-eventhub',
                eventHub: config.elkEventHub,
                eventHubNamespace: config.elkEventHubNamespace,
                eventHubPartition: 'temp' //irrelevant for this service
            });
            await eventHubOutputStream.init();
            blobConfig.tableStorage = new TableStorage(blobConfig.connectionString);
            const blobStream = new BlobStream({
                accountName: blobConfig.storageAccount,
                accountKey: blobConfig.storageKey,
                container: blobConfig.container,
                folderPrefix: folderPrefix,
                fromDate: blobConfig.fromDate,
                eventHubOutputStream: eventHubOutputStream
            });
            await blobStream.init();
            blobConfig.blobStream = blobStream;
            const limiter = getMutexLimiter();
            promises.push({
                blobStream,
                limiter
            });
        }
    }
}

async function repeatFetchAndProcess() {
    if (isWebJobShuttingDown()) {
        logger.trackEvent({ name: "Application shutting down" });
        return;
    }
    try {
        fetchAndProcess();
    } catch (err) {
        logger.trackException({ exception: err });
        throw err;
    }
    timers.setTimeout(repeatFetchAndProcess, 10000);
}

function isWebJobShuttingDown() {
    const shutdownFileName = process.env.WEBJOBS_SHUTDOWN_FILE;
    if (!shutdownFileName) {

        return false;
    }
    // tslint:disable-next-line: tsr-detect-non-literal-fs-filename
    return fs.existsSync(shutdownFileName);
}

async function fetchAndProcess() {
    for (let promise of promises) {
        const limiter = promise.limiter;
        const blobStream: BlobStream = promise.blobStream;
        limiter.schedule(() => blobStream.getBlobContents());
    }
}

export {
    run
}
