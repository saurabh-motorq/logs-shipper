/* tslint:disable */
require("dotenv").config();
import * as appInsights from "applicationinsights";
import * as _ from "lodash";
import config from "./config";

let client = null;

if (isAppInsightsEnabled()) {
	appInsights.setup();
	appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = config.appName;
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
	} else if (telemetry && !telemetry.exception) {
		telemetry = { exception: new Error(`trackException received argument with no exception field. Arguement passed is ${JSON.stringify(telemetry)}`) };
	} else if (telemetry && telemetry.exception && !(telemetry.exception instanceof Error)) {
		telemetry.exception = new Error(JSON.stringify(telemetry.exception));
	}
	console.error(telemetry.exception);

	if (isAppInsightsEnabled()) {
		client.trackException(telemetry);
	}
}

function trackTrace(telemetry, logLevel?) {
	if (_.isNil(logLevel)) {
		logLevel = LogLevel.VERBOSE;
	}
	telemetry.appName = config.appName
	if (isConsoleLogsEnabled()) {
		telemetry.logType = 'trace';
		// tslint:disable-next-line:no-console
		console.log(JSON.stringify(telemetry));
	}
	if (isAppInsightsEnabled() && logLevel <= currentLogLevel) {
		client.trackTrace(telemetry)
	}
}

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

function trackMetric(telemetry, logLevel?) {
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

function trackDependency(telemetry, logLevel?) {
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

function flush() {
	if (isAppInsightsEnabled()) {
		client.flush({ isAppCrashing: true });
	}
}

const LogLevel = {
	IMPORTANT: 0,
	DEBUG: 1,
	VERBOSE: 2
};

const currentLogLevel = LogLevel[config.logLevel];

// ported from https://github.com/Microsoft/ApplicationInsights-node.js/blob/develop/TelemetryProcessors/SamplingTelemetryProcessor.ts
function samplingTelemetryProcessor(envelope, contextObjects) {
	let samplingPercentage = config.appInsightsSamplingPercentage;
	let isSampledIn = false;

	if (samplingPercentage === null || samplingPercentage === undefined || samplingPercentage >= 100) {
		return true;
	} else if (envelope.data &&
		["MetricData", "ExceptionData", "RequestData",
			"EventData"].includes(envelope.data.baseType)) {
		return true;
	} else if (envelope.data &&
		envelope.data.baseType === "RemoteDependencyData"
		&& !envelope.data.baseData.success
	) {
		printDependencyLogs(envelope);
		return true;
	} else if (contextObjects.correlationContext && contextObjects.correlationContext.operation) {
		// If we're using dependency correlation, sampling should retain all telemetry from a given request
		isSampledIn = getSamplingHashCode(contextObjects.correlationContext.operation.id) < samplingPercentage;
	} else {
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
			depedencyLog.durationMs = convertAppInsightsDurationToMs(depedencyLog.duration) || 0
		}
		depedencyLog.appName = config.appName;
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
	return (durationSplit[0] * 60 * 60 + durationSplit[1] * 60 + durationSplit[2] * 1) * 1000 + durationSplit[3] * 1
}

function isAppInsightsEnabled() {
	if (config.appName && config.appName.includes('fleet-api')) {
		return config.enableAppInsightsFleetApi;
	}
	else {
		return config.enableAppInsightsWebjobs;
	}
}

function isConsoleLogsEnabled() {
	if (config.appName && config.appName.includes('fleet-api')) {
		return config.enableConsoleLogsFleetApi;
	}
	else {
		return config.enableConsoleLogsWebjobs;
	}
}

export { trackTrace, trackException, trackEvent, trackMetric, trackDependency, flush, LogLevel };
