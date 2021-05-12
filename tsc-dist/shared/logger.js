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
exports.LogLevel = exports.flush = exports.trackDependency = exports.trackMetric = exports.trackEvent = exports.trackException = exports.trackTrace = void 0;
/* tslint:disable */
require("dotenv").config();
const appInsights = __importStar(require("applicationinsights"));
const _ = __importStar(require("lodash"));
const config_1 = __importDefault(require("./config"));
let client = null;
if (isAppInsightsEnabled()) {
    appInsights.setup();
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = config_1.default.appName;
    appInsights.Configuration.setAutoDependencyCorrelation(false)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(false)
        .setUseDiskRetryCaching(true);
    client = appInsights.defaultClient;
    client.config.correlationHeaderExcludedDomains.push("*.core.windows.net");
    client.addTelemetryProcessor(samplingTelemetryProcessor);
    appInsights.start();
}
function trackException(telemetry) {
    if (!telemetry) {
        telemetry = { exception: new Error("trackException received missing/invalid argument") };
    }
    else if (telemetry && !telemetry.exception) {
        telemetry = { exception: new Error(`trackException received argument with no exception field. Arguement passed is ${JSON.stringify(telemetry)}`) };
    }
    else if (telemetry && telemetry.exception && !(telemetry.exception instanceof Error)) {
        telemetry.exception = new Error(JSON.stringify(telemetry.exception));
    }
    console.error(telemetry.exception);
    if (isAppInsightsEnabled()) {
        client.trackException(telemetry);
    }
}
exports.trackException = trackException;
function trackTrace(telemetry, logLevel) {
    if (_.isNil(logLevel)) {
        logLevel = LogLevel.VERBOSE;
    }
    telemetry.appName = config_1.default.appName;
    if (isConsoleLogsEnabled()) {
        telemetry.logType = 'trace';
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(telemetry));
    }
    if (isAppInsightsEnabled() && logLevel <= currentLogLevel) {
        client.trackTrace(telemetry);
    }
}
exports.trackTrace = trackTrace;
function trackEvent(telemetry) {
    if (isConsoleLogsEnabled()) {
        telemetry.logType = 'event';
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(telemetry));
    }
    if (isAppInsightsEnabled()) {
        client.trackEvent(telemetry);
    }
}
exports.trackEvent = trackEvent;
function trackMetric(telemetry, logLevel) {
    if (_.isNil(logLevel)) {
        logLevel = LogLevel.VERBOSE;
    }
    if (telemetry && telemetry.value instanceof String) {
        telemetry.value = parseFloat(telemetry.value);
    }
    if (isConsoleLogsEnabled()) {
        telemetry.logType = 'metric';
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(telemetry));
    }
    if (isAppInsightsEnabled()) {
        client.trackMetric(telemetry);
    }
}
exports.trackMetric = trackMetric;
function trackDependency(telemetry, logLevel) {
    if (_.isNil(logLevel)) {
        logLevel = LogLevel.VERBOSE;
    }
    if (isConsoleLogsEnabled()) {
        // tslint:disable-next-line:no-console
        console.log(telemetry);
    }
    if (isAppInsightsEnabled()) {
        telemetry.logType = 'dependency';
        client.trackDependency(JSON.stringify(telemetry));
    }
}
exports.trackDependency = trackDependency;
function flush() {
    if (isAppInsightsEnabled()) {
        client.flush({ isAppCrashing: true });
    }
}
exports.flush = flush;
const LogLevel = {
    IMPORTANT: 0,
    DEBUG: 1,
    VERBOSE: 2
};
exports.LogLevel = LogLevel;
const currentLogLevel = LogLevel[config_1.default.logLevel];
// ported from https://github.com/Microsoft/ApplicationInsights-node.js/blob/develop/TelemetryProcessors/SamplingTelemetryProcessor.ts
function samplingTelemetryProcessor(envelope, contextObjects) {
    let samplingPercentage = config_1.default.appInsightsSamplingPercentage;
    let isSampledIn = false;
    if (samplingPercentage === null || samplingPercentage === undefined || samplingPercentage >= 100) {
        return true;
    }
    else if (envelope.data &&
        ["MetricData", "ExceptionData", "RequestData",
            "EventData"].includes(envelope.data.baseType)) {
        return true;
    }
    else if (envelope.data &&
        envelope.data.baseType === "RemoteDependencyData"
        && !envelope.data.baseData.success) {
        printDependencyLogs(envelope);
        return true;
    }
    else if (contextObjects.correlationContext && contextObjects.correlationContext.operation) {
        // If we're using dependency correlation, sampling should retain all telemetry from a given request
        isSampledIn = getSamplingHashCode(contextObjects.correlationContext.operation.id) < samplingPercentage;
    }
    else {
        // If we're not using dependency correlation, sampling should use a random distribution on each item
        isSampledIn = (Math.random() * 100) < samplingPercentage;
    }
    if (isSampledIn) {
        printDependencyLogs(envelope);
    }
    return isSampledIn;
}
function getSamplingHashCode(input) {
    const csharpMin = -2147483648;
    const csharpMax = 2147483647;
    let hash = 5381;
    if (!input) {
        return 0;
    }
    while (input.length < 8) {
        input = input + input;
    }
    for (let i = 0; i < input.length; i++) {
        // JS doesn't respond to integer overflow by wrapping around. Simulate it with bitwise operators ( | 0)
        hash = ((((hash << 5) + hash) | 0) + input.charCodeAt(i) | 0);
    }
    hash = hash <= csharpMin ? csharpMax : Math.abs(hash);
    return (hash / csharpMax) * 100;
}
function printDependencyLogs(envelope) {
    if (envelope.data && envelope.data.baseData) {
        const depedencyLog = _.cloneDeep(envelope.data.baseData);
        depedencyLog.type = envelope.data.baseType;
        if (depedencyLog.duration) {
            depedencyLog.durationMs = convertAppInsightsDurationToMs(depedencyLog.duration) || 0;
        }
        depedencyLog.appName = config_1.default.appName;
        depedencyLog.logType = 'remoteDependency';
        if (isConsoleLogsEnabled()) {
            console.log(JSON.stringify(depedencyLog));
        }
    }
}
//Format :  '01:00:00.010'
function convertAppInsightsDurationToMs(duration) {
    let durationSplit = duration.split(':');
    const secondWithMilliSecond = durationSplit.pop();
    durationSplit.push(...secondWithMilliSecond.split('.'));
    return (durationSplit[0] * 60 * 60 + durationSplit[1] * 60 + durationSplit[2] * 1) * 1000 + durationSplit[3] * 1;
}
function isAppInsightsEnabled() {
    if (config_1.default.appName && config_1.default.appName.includes('fleet-api')) {
        return config_1.default.enableAppInsightsFleetApi;
    }
    else {
        return config_1.default.enableAppInsightsWebjobs;
    }
}
function isConsoleLogsEnabled() {
    if (config_1.default.appName && config_1.default.appName.includes('fleet-api')) {
        return config_1.default.enableConsoleLogsFleetApi;
    }
    else {
        return config_1.default.enableConsoleLogsWebjobs;
    }
}
//# sourceMappingURL=logger.js.map