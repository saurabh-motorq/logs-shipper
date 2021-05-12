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
exports.emit = void 0;
const moment_1 = __importDefault(require("moment"));
const config_1 = __importDefault(require("./config"));
const logger = __importStar(require("./logger"));
const table_storage_1 = require("./table-storage");
const heartbeatTableStorage = new table_storage_1.TableStorage(config_1.default.heartBeatTableStorageConnectionString);
const heartbeatState = {};
function emit(prefix) {
    if (canEmitHeartbeat(prefix)) {
        logger.trackEvent({ name: `${prefix} heartbeat` });
        heartbeatState[prefix] = moment_1.default();
        if (config_1.default.shouldEmitHBToTableStore) {
            emitHeartbeatToTableStore(prefix);
        }
    }
}
exports.emit = emit;
function emitHeartbeatToTableStore(prefix) {
    try {
        const partitionKey = config_1.default.customerName;
        const rowKey = `${prefix} heartbeat`;
        const tableEntry = heartbeatTableStorage.createTableEntry(partitionKey, rowKey, {});
        heartbeatTableStorage.upsertEntityIntoTableStore(config_1.default.heartBeatTable, tableEntry);
    }
    catch (exception) {
        exception.message = `Heartbeat tablestore exception; ${exception.message}`;
        logger.trackException({ exception });
    }
}
function canEmitHeartbeat(prefix) {
    if (heartbeatState[prefix]) {
        return moment_1.default().diff(heartbeatState[prefix], 'milliseconds') >= config_1.default.heartbeatIntervalMilliseconds;
    }
    return true;
}
//# sourceMappingURL=heartbeat.js.map