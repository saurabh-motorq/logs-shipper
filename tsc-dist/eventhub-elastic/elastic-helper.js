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
exports.processBatch = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const moment_1 = __importDefault(require("moment"));
const lodash_1 = __importDefault(require("lodash"));
const log_parser_1 = require("./log-parser");
const config_1 = __importDefault(require("shared/config"));
const logger = __importStar(require("shared/logger"));
const client = new elasticsearch_1.Client({
    node: config_1.default.elasticUrl,
    auth: {
        username: config_1.default.elasticUserName,
        password: config_1.default.elasticPassword
    }
});
async function processBatch(messages) {
    const logs = [];
    for (let message of messages) {
        const log = message.body;
        const logArray = log.split(',');
        if (logArray.length <= 4) {
            continue;
        }
        if (logArray[1].toLowerCase() === 'exception') {
            continue;
        }
        if (logArray[1].toLowerCase() === 'error') {
            continue;
        }
        if (logArray[1].toLowerCase() === 'information' && logArray[8] && logArray[8].indexOf('metric') > -1 && logArray[8].length > 200) {
            continue;
        }
        if (logArray[1].toLowerCase() === 'information' && logArray[7] && logArray[7].indexOf('metric') > -1 && logArray[7].length > 200) {
            continue;
        }
        if (logArray[8] && logArray[8].indexOf('spActivityIdsAndExecutionTimeInMilli') > -1 || (logArray[7] && logArray[7].indexOf('spActivityIdsAndExecutionTimeInMilli') > -1)) {
            continue;
        }
        if (logArray[2].toLowerCase().indexOf('motorqarchiver') > -1) {
            continue;
        }
        else {
            logs.push(log_parser_1.getFormattedLog(log));
        }
    }
    return await sendToElastic(logs);
}
exports.processBatch = processBatch;
async function sendToElastic(logs) {
    console.log(logs.length);
    if (logs.length == 0) {
        return [];
    }
    const result = await client.helpers.bulk({
        datasource: logs,
        retries: 3,
        onDrop(doc) {
            logger.trackMetric({ name: 'dropper-message-count', value: 1 });
        },
        onDocument(doc) {
            doc = filterFields(doc);
            return {
                index: { _index: getIndex(doc) }
            };
        }
    });
    console.log(result);
    return result;
}
function filterFields(doc) {
    const remoteDepFileds = ['responseCode', 'result', 'target', 'durationMs', 'fullUrl', 'baseUrl', 'path', 'method'];
    const metricFileds = ['name', 'value'];
    const eventFields = ['name'];
    let filedsToRemove = [];
    if (doc.type == 'trace') {
        filedsToRemove = lodash_1.default.union(remoteDepFileds, metricFileds, eventFields);
    }
    else if (doc.type == 'metric') {
        filedsToRemove = lodash_1.default.union(remoteDepFileds);
    }
    else if (doc.type == 'event') {
        filedsToRemove = lodash_1.default.union(remoteDepFileds, ['value']);
    }
    else if (doc.type == 'remoteDependency') {
        filedsToRemove = lodash_1.default.union(metricFileds, eventFields);
    }
    for (const field of filedsToRemove) {
        delete doc[field];
    }
    return doc;
}
function getIndex(doc) {
    const year = moment_1.default(doc.log_timestamp).year();
    const month = moment_1.default(doc.log_timestamp).month();
    const week = moment_1.default(doc.log_timestamp).week();
    const date = moment_1.default(doc.log_timestamp).date();
    doc.envName = getEnvAndAppServiceNameForElastic(doc.appServiceName);
    if (!doc.type) {
        doc.type = 'trace';
    }
    else if (doc.type == 'event' && doc.message.indexOf('heartbeat') > -1) {
        doc.is_hb = true;
        return `logs-${doc.type}-${year}.${month}-${week}`;
    }
    else if (doc.type == 'remoteDependency') {
        doc.type = 'remote-dep';
    }
    return `logs-${doc.type}-${year}.${month}-${week}-${date}`;
}
function getEnvAndAppServiceNameForElastic(appServiceName) {
    if (!appServiceName) {
        return 'unknown';
    }
    else if (appServiceName.toLowerCase().indexOf('arimotorqdemo-app-service') > -1) {
        return 'arimotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('budget-app-service') > -1) {
        return 'budgetprod';
    }
    else if (appServiceName.toLowerCase().indexOf('clutchmotorqprod') > -1) {
        return 'clutchmotorqprod';
    }
    else if (appServiceName.toLowerCase().indexOf('clutch-app-service') > -1) {
        return 'clutchmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('donlenmotorqdemo-app-service') > -1) {
        return 'donlenmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('elementmotorqdemo-app-service') > -1) {
        return 'elementmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('leaseplanmotorqdemo') > -1) {
        return 'leaseplanmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('leonmotorqprod-app-service') > -1) {
        return 'leonmotorqprod';
    }
    else if (appServiceName.toLowerCase().indexOf('lynkd-app-service') > -1) {
        return 'lynkdmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('mamo') > -1) {
        return 'mamo';
    }
    else if (appServiceName.toLowerCase().indexOf('merchantsmotorqdemo') > -1) {
        return 'merchantsmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('merchantsmotorqprod') > -1) {
        return 'merchantsmotorqprod';
    }
    else if (appServiceName.toLowerCase().indexOf('mike') > -1) {
        return 'mike';
    }
    else if (appServiceName.toLowerCase().indexOf('seligmotorqdemo-app-service') > -1) {
        return 'seligmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('tsd-app-service') > -1) {
        return 'tsdmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('tsdmotorqprod') > -1) {
        return 'tsdmotorqprod';
    }
    else if (appServiceName.toLowerCase().indexOf('wheelsmotorqprod') > -1) {
        return 'wheelsmotorqprod';
    }
    else if (appServiceName.toLowerCase().indexOf('wfleetqaapi') > -1) {
        return 'wfleetqa';
    }
    else if (appServiceName.toLowerCase().indexOf('motorqcfapiv2dev') > -1) {
        return 'motorqcfapiv2dev';
    }
    else if (appServiceName.toLowerCase().indexOf('trippathtest-webjobs') > -1) {
        return 'trippathtest-webjobs';
    }
    else if (appServiceName.toLowerCase().indexOf('sunpowercfapiv2') > -1) {
        return 'sunpowermotorqprod';
    }
    else if (appServiceName.toLowerCase().indexOf('sunpowerfmcaapi') > -1) {
        return 'sunpowermotorqprod';
    }
    else if (appServiceName.toLowerCase().indexOf('emkaymotorqdemoapi') > -1) {
        return 'emkaymotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('unionmotorqdemo') > -1) {
        return 'unionmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('wexmotorqdemo-app-service') > -1) {
        return 'wexmotorqdemo';
    }
}
//# sourceMappingURL=elastic-helper.js.map