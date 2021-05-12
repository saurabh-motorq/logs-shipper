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
exports.KeyValueCheckpointer = void 0;
/* tslint:disable:typedef */
const logger = __importStar(require("shared/logger"));
const table_storage_1 = require("shared/table-storage");
const tableStorage = table_storage_1.TableStorage.getDefaultInstance();
const config_1 = __importDefault(require("./config"));
class KeyValueCheckpointer {
    constructor(checkpointId, checkpointDocumentType) {
        this.checkpointDocumentType = checkpointDocumentType;
        this.checkpointId = checkpointId;
    }
    async init() {
        await tableStorage.initaliseTable(config_1.default.checkpointTable);
        await this.restoreLastCheckpoint();
    }
    async checkpoint(value, lastRecordCreatedTime) {
        const item = {
            'value': value,
            'lastRecordCreatedTime': lastRecordCreatedTime,
        };
        const checkpointEntity = tableStorage.createTableEntry(this.checkpointDocumentType, this.checkpointId, {
            data: JSON.stringify(item)
        });
        await tableStorage.upsertEntityIntoTableStore(config_1.default.checkpointTable, checkpointEntity);
        this.lastCheckpoint = {
            value,
            lastRecordCreatedTime
        };
        logger.trackTrace({
            message: `Checkpointed value for ${this.checkpointId} : ${this.lastCheckpoint.value}`
        });
    }
    async restoreLastCheckpoint() {
        const checkpointEntity = await tableStorage.getEntity(config_1.default.checkpointTable, this.checkpointDocumentType, this.checkpointId);
        let item = null;
        if (checkpointEntity) {
            item = tableStorage.getDataFromTableEntry(checkpointEntity);
        }
        if (item && item.value) {
            this.lastCheckpoint = {
                value: item.value,
                lastRecordCreatedTime: item.lastRecordCreatedTime
            };
        }
        else {
            this.lastCheckpoint = null;
        }
    }
    getLastCheckpoint() {
        if (this.lastCheckpoint) {
            return this.lastCheckpoint;
        }
        return {};
    }
}
exports.KeyValueCheckpointer = KeyValueCheckpointer;
//# sourceMappingURL=key-value-checkpointer.js.map