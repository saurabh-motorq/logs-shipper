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
const fs = __importStar(require("fs"));
const timers = __importStar(require("timers"));
const logger = __importStar(require("shared/logger"));
const config_1 = __importDefault(require("shared/config"));
const heartbeat = __importStar(require("shared/heartbeat"));
const enums_1 = require("shared/enums");
const event_hub_input_stream_1 = require("shared/event-hub-input-stream");
const rateLimiter = __importStar(require("shared/rate-limiter"));
const elastic_helper_1 = require("./elastic-helper");
let eventHubInputStream = null;
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
    eventHubInputStream = new event_hub_input_stream_1.EventHubInputStream({
        eventHubNamespace: config_1.default.elkEventHubNamespace,
        eventHub: config_1.default.elkEventHub,
        eventHubPartition: instanceId,
        eventHubFetchRate: config_1.default.eventHubFetchRate,
        consumerGroup: null,
        checkpointId: getCheckpointId(),
        checkpointerType: enums_1.CheckpointerType.KeyValue,
        maxWaitingMessageCount: config_1.default.eventHubInputWaitingMessageCount
    });
    await eventHubInputStream.init();
}
function getCheckpointId() {
    const appName = config_1.default.appName;
    return appName;
}
async function repeatFetchAndProcess() {
    const mutexlimiter = rateLimiter.getMutexLimiter();
    if (isWebJobShuttingDown()) {
        logger.trackEvent({ name: "Application shutting down" });
        return;
    }
    try {
        await mutexlimiter.schedule(() => fetchAndProcess());
    }
    catch (err) {
        logger.trackException({ exception: err });
        throw err;
    }
    timers.setTimeout(repeatFetchAndProcess, 1000);
}
async function fetchAndProcess() {
    let messages = null;
    try {
        messages = await eventHubInputStream.getCurrentBatch();
        logger.trackMetric({ name: 'Message-Count', value: messages.length });
    }
    catch (err) {
        logger.trackException({ exception: err });
        logger.trackTrace({ message: "Error fetching messages from EH" });
        return;
    }
    if (messages && messages.length) {
        const result = await elastic_helper_1.processBatch(messages);
        if (result.failed) {
            logger.trackMetric({ name: 'dropped-messages', value: result.failed });
        }
        if (result.successful) {
            logger.trackMetric({ name: 'pushed-messages', value: result.successful });
        }
        if (result.time) {
            logger.trackMetric({ name: 'total-time-ms', value: result.time });
            logger.trackMetric({ name: 'pushed-messages-per-sec', value: (result.total / result.time) * 1000 });
        }
    }
    await eventHubInputStream.checkpointCurrentBatch();
    heartbeat.emit(config_1.default.appName);
}
function isWebJobShuttingDown() {
    const shutdownFileName = process.env.WEBJOBS_SHUTDOWN_FILE;
    if (!shutdownFileName) {
        return false;
    }
    // tslint:disable-next-line: tsr-detect-non-literal-fs-filename
    return fs.existsSync(shutdownFileName);
}
//# sourceMappingURL=run.js.map