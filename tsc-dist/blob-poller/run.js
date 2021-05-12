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
exports.run = void 0;
const config_1 = __importDefault(require("../shared/config"));
const fs = __importStar(require("fs"));
const table_storage_1 = require("../shared/table-storage");
const event_hub_output_stream_1 = require("../shared/event-hub-output-stream");
const blob_stream_1 = require("../shared/blob-stream");
const logger = __importStar(require("../shared/logger"));
const tableStorage = table_storage_1.TableStorage.getDefaultInstance();
const envConfigs_1 = require("./envConfigs");
const bottleneck_1 = __importDefault(require("bottleneck"));
const timers = __importStar(require("timers"));
let mutexlimiter = null;
const promises = [];
function getMutexLimiter() {
    const limiter = new bottleneck_1.default({
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
    }
    catch (error) {
        logger.trackException({ exception: error });
        process.exit(0);
    }
}
exports.run = run;
async function init(instanceId) {
    for (const blobConfig of envConfigs_1.envConfig.blobConfigs) {
        if (parseInt(instanceId) != blobConfig.instanceId) {
            continue;
        }
        for (const folderPrefix of blobConfig.folderPrefixes) {
            const eventHubOutputStream = new event_hub_output_stream_1.EventHubOutputStream({
                id: 'logs-eventhub',
                eventHub: config_1.default.elkEventHub,
                eventHubNamespace: config_1.default.elkEventHubNamespace,
                eventHubPartition: 'temp' //irrelevant for this service
            });
            await eventHubOutputStream.init();
            blobConfig.tableStorage = new table_storage_1.TableStorage(blobConfig.connectionString);
            const blobStream = new blob_stream_1.BlobStream({
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
    }
    catch (err) {
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
        const blobStream = promise.blobStream;
        limiter.schedule(() => blobStream.getBlobContents());
    }
}
//# sourceMappingURL=run.js.map