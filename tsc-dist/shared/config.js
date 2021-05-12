"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:typedef */
require("dotenv").config();
const config = {};
config.appName = process.env.APP_NAME || process.env.WEBJOBS_NAME;
config.endpoint = process.env.DOCDB_ENDPOINT;
config.primaryKey = process.env.DOCDB_ACCESS_KEY;
config.cosmosdbMaxSockets = parseInt(process.env.COSMOSDB_MAX_SOCKETS) || 256;
config.cosmosdbMaxFreeSockets = parseInt(process.env.COSMOSDB_MAX_FREE_SOCKETS) || 256;
config.database = {
    "id": process.env.DOCDB_NAME || "core-fleet"
};
config.collection = {
    "entitiesId": process.env.DOCDB_ENTITIES_COLLECTION || "entities",
    "telematicsId": process.env.DOCDB_TELEMATICS_COLLECTION || "telematics",
    'referenceDataId': process.env.DOCDB_REFERENCE_DATA_COLLECTION || 'reference-data'
};
config.elkStorageConnectionString = process.env.ELK_STORAGE_CONNECTION_STRING;
config.elkCheckpointTable = process.env.ELK_CHECKPOINT_TABLE || 'elkcheckpoints';
config.elkEventHub = process.env.ELK_EVENTHUB;
config.elkEventHubNamespace = process.env.ELK_EH_NAMESPACE;
config.elkEventHubPartitionCount = process.env.ELK_EVENTHUB_PARTITION_COUNT;
config.eventHubFetchRate = process.env.EVENTHUB_FETCH_RATE || 3000;
config.appBlobStorageConnectionString = process.env.ELK_STORAGE_CONNECTION_STRING;
config.checkpointTable = process.env.CHECKPOINT_TABLE || 'checkpoints';
config.elasticUrl = process.env.ELASTIC_URL;
config.elasticUserName = process.env.ELASTIC_USER || 'elastic';
config.elasticPassword = process.env.ELASTIC_PASS;
config.eventHubInputWaitingMessageCount = parseInt(process.env.EVENT_HUB_WAITING_MESSAGE_COUNT) || 50000;
config.heartBeatTableStorageConnectionString = process.env.HB_TABLESTORE_CONNECTION_STRING;
config.heartBeatTable = process.env.HEARTBEAT_TABLE || 'heartbeats';
config.shouldEmitHBToTableStore = (process.env.HEARTBEAT_TABLESTORE || "true") === "true";
if (config.isMotorqTestEnv) {
    config.shouldEmitHBToTableStore = false;
}
config.customerName = process.env.CUSTOMER_NAME || 'WHEELS';
config.azureLocalStorage = (process.env.AZURE_LOCAL_STORAGE || "false") === "true";
config.downstreamRetryLimit = parseInt(process.env.DOWNSTREAM_RETRY_LIMIT) || 10;
config.maxBackOffTimeLimit = parseInt(process.env.MAX_BACKOFF_TIME_LIMIT) || 120;
config.feedTtl = parseInt(process.env.FEED_TTL_SECS) || (5 * 24 * 60 * 60);
config.cursorMappingTable = (process.env.CURSOR_MAPPING_TABLE || 'cursormappingtable');
config.enableAppInsights = (process.env.ENABLE_APPINSIGHTS || "true") === "true";
config.enableConsoleLogs = (process.env.ENABLE_CONSOLE_LOGS || "true") === "true";
config.enableAppInsightsFleetApi = (process.env.ENABLE_AI_FLEET_API || "true") === "true";
config.enableAppInsightsWebjobs = (process.env.ENABLE_AI_WEBJOBS || "true") === "true";
config.enableConsoleLogsFleetApi = (process.env.ENABLE_CONSOLE_LOGS_FLEET_API || "true") === "true";
config.enableConsoleLogsWebjobs = (process.env.ENABLE_CONSOLE_LOGS_WEBJOBS || "true") === "true";
config.logLevel = process.env.LOG_LEVEL || "DEBUG";
config.appInsightsSamplingPercentage = parseInt(process.env.APPINSIGHTS_SAMPLING_PERCENTAGE) || 33;
config.heartbeatIntervalMilliseconds = (process.env.HEARTBEAT_INTERVAL_MILLISECONDS) || 30 * 1000;
config.shouldRestartIdleEventHubConnection = (process.env.SHOULD_RESTART_IDLE_EVENT_HUB_CONNECTION || "true") === "true";
config.eventHubMaxIdleTimeMins = parseInt(process.env.EVENT_HUB_MAX_IDLE_TIME_MINS) || 2;
config.eventHubMsgSizeLimitBytes = process.env.EVENT_HUB_MSG_SIZE_LIMIT_BYTES || 9 * 10 ** 5; // 900kb
config.isOEMDuplicateVinsEnabled = (process.env.IS_OEMDUPLICATE_VINS_ENABLED || 'false') == 'true';
config.enableMemoryUsageMetric = (process.env.ENABLE_MEMORY_USAGE_METRIC || 'false') === 'true';
config.appBlobStorageConnectionString = process.env.APP_BLOB_STORAGE_CONNECTION_STRING;
config.elkCommonEnvs = [
    'ari',
    'donlen',
    'lynkd'
];
exports.default = config;
//# sourceMappingURL=config.js.map