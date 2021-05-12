import * as fs from "fs";
import * as timers from "timers";
import * as logger from "shared/logger";
import config from 'shared/config';
import * as heartbeat from 'shared/heartbeat';
import { CheckpointerType } from "shared/enums";
import { EventHubInputStream } from "shared/event-hub-input-stream";
import * as rateLimiter from "shared/rate-limiter";
import { processBatch } from './elastic-helper'

let eventHubInputStream = null as EventHubInputStream;
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
    eventHubInputStream = new EventHubInputStream({
        eventHubNamespace: config.elkEventHubNamespace,
        eventHub: config.elkEventHub,
        eventHubPartition: instanceId,
        eventHubFetchRate: config.eventHubFetchRate,
        consumerGroup: null,
        checkpointId: getCheckpointId(),
        checkpointerType: CheckpointerType.KeyValue,
        maxWaitingMessageCount: config.eventHubInputWaitingMessageCount
    });
    await eventHubInputStream.init();
}

function getCheckpointId() {
    const appName = config.appName;
    return appName
}


async function repeatFetchAndProcess() {
    const mutexlimiter = rateLimiter.getMutexLimiter();
    if (isWebJobShuttingDown()) {
        logger.trackEvent({ name: "Application shutting down" });
        return;
    }
    try {
        await mutexlimiter.schedule(() => fetchAndProcess());
    } catch (err) {
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
    } catch (err) {
        logger.trackException({ exception: err });
        logger.trackTrace({ message: "Error fetching messages from EH" });
        return;
    }
    if (messages && messages.length) {
        const result:any = await processBatch(messages);
        if(result.failed){
            logger.trackMetric({ name: 'dropped-messages', value: result.failed });
        }
        if(result.successful){
            logger.trackMetric({ name: 'pushed-messages', value: result.successful });
        }
        if(result.time) {
            logger.trackMetric({ name: 'total-time-ms', value: result.time });
            logger.trackMetric({ name: 'pushed-messages-per-sec', value: (result.total/result.time)*1000 });
        }
        
    }
    await eventHubInputStream.checkpointCurrentBatch();
    heartbeat.emit(config.appName)
}

function isWebJobShuttingDown() {
    const shutdownFileName = process.env.WEBJOBS_SHUTDOWN_FILE;
    if (!shutdownFileName) {

        return false;
    }
    // tslint:disable-next-line: tsr-detect-non-literal-fs-filename
    return fs.existsSync(shutdownFileName);
}

export { run };