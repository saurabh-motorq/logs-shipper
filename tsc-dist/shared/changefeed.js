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
exports.getPartitionKeyRanges = exports.discardGoneRanges = exports.readChangeFeed = exports.getChangeFeed = void 0;
/* tslint:disable:typedef */
require("dotenv").config();
const documentdb_1 = require("documentdb");
const config_1 = __importDefault(require("./config"));
const lodash_mixins_1 = require("./lodash-mixins");
const logger = __importStar(require("./logger"));
const enums_1 = require("./enums");
const connectionPolicy = new documentdb_1.DocumentBase.ConnectionPolicy();
if (lodash_mixins_1._.startsWith(config_1.default.endpoint.toLowerCase(), "https://localhost:8081")) {
    connectionPolicy.DisableSSLVerification = true;
}
connectionPolicy.RetryOptions = {
    MaxRetryAttemptCount: 9,
    MaxWaitTimeInSeconds: 30
};
const client = new documentdb_1.DocumentClient(config_1.default.endpoint, { "masterKey": config_1.default.primaryKey }, connectionPolicy);
const databaseUrl = `dbs/${config_1.default.database.id}`;
const telematicsCollectionUrl = `${databaseUrl}/colls/${config_1.default.collection.telematicsId}`;
const entitiesCollectionUrl = `${databaseUrl}/colls/${config_1.default.collection.entitiesId}`;
const referenceDataCollectionUrl = `${databaseUrl}/colls/${config_1.default.collection.referenceDataId}`;
async function getChangeFeed(contToken, collection) {
    if (collection === enums_1.DBCollection.Entity) {
        return getChangeFeedPrivate(contToken, entitiesCollectionUrl, null);
    }
    else if (collection === enums_1.DBCollection.ReferenceData) {
        return getChangeFeedPrivate(contToken, referenceDataCollectionUrl, null);
    }
    else {
        throw new Error(`Unsupported collection type`);
    }
}
exports.getChangeFeed = getChangeFeed;
function getChangeFeedPrivate(contToken, collectionUrl, partitionKey) {
    const options = {
        a_im: "Incremental feed",
        accessCondition: {
            type: "IfNoneMatch",
            condition: contToken
        },
        maxItemCount: config_1.default.changeFeedMaxItemCount,
    };
    if (!lodash_mixins_1._.isUndefined(partitionKey)) {
        options.partitionKey = partitionKey;
    }
    return new Promise(async (resolve, reject) => {
        const queryIterator = await client.readDocuments(collectionUrl, options);
        const resultCallback = async (error, results, headers) => {
            if (headers) {
                logger.trackMetric({ name: "ChangeFeedItemCount", value: headers["x-ms-item-count"] });
                logger.trackMetric({ name: "ChangeFeedRequestCharge", value: headers["x-ms-request-charge"] });
                logger.trackMetric({ name: "ChangeFeedRetryCount", value: headers["x-ms-throttle-retry-count"] });
            }
            if (error) {
                logger.trackException({ exception: error });
                reject(error);
            }
            else {
                if (!headers.etag) {
                    logger.trackException({ exception: new Error("Continuation token from reading change feed is null or undefined") });
                }
                resolve({ items: results || [], continuation: headers.etag });
            }
        };
        queryIterator.executeNext(resultCallback);
    });
}
async function getPartitionKeyRanges(collection) {
    return new Promise((resolve, reject) => {
        const partitionKeyRangesIterator = client.readPartitionKeyRanges(getCollectionUrlFromCollectionName(collection));
        partitionKeyRangesIterator.toArray((err, resources) => {
            if (err) {
                reject(err);
            }
            const ranges = discardGoneRanges(resources);
            resolve(ranges);
        });
    });
}
exports.getPartitionKeyRanges = getPartitionKeyRanges;
function getCollectionUrlFromCollectionName(collection) {
    if (collection.toLowerCase().includes('telematics')) {
        return telematicsCollectionUrl;
    }
    else if (collection.toLowerCase().includes('entities')) {
        return entitiesCollectionUrl;
    }
    else if (collection.toLowerCase().includes('reference-data')) {
        return referenceDataCollectionUrl;
    }
    else
        throw new Error(`${collection} not present in cosmos db. Collecion name should be name of a container`);
}
function discardGoneRanges(ranges) {
    // A split may complete between the readPartitionKeyRanges query page responses.
    // We need to discard the old parent ranges which are replaced with new children
    // ranges in the later pages.
    const parentIds = {};
    ranges.forEach(range => {
        if (range.Parents !== undefined && range.Parents != null && Array.isArray(range.Parents)) {
            range.Parents.forEach(parentId => { parentIds[parentId] = true; });
        }
    });
    const filteredRanges = ranges.filter(range => !(range.Id in parentIds));
    return filteredRanges;
}
exports.discardGoneRanges = discardGoneRanges;
async function readChangeFeed(partitionKeyRangeId, maxItemCount, continuationToken, collection) {
    const options = {
        a_im: "Incremental feed",
        accessCondition: {
            type: "IfNoneMatch",
            condition: continuationToken
        },
        partitionKeyRangeId,
        maxItemCount: maxItemCount || 5000
    };
    return new Promise(async (resolve, reject) => {
        const collectionUrl = collection ? getCollectionUrlFromCollectionName(collection) : telematicsCollectionUrl;
        const queryIterator = await client.readDocuments(collectionUrl, options);
        const resultCallback = async (error, results, headers) => {
            if (error) {
                logger.trackException({ exception: error });
                reject(error);
            }
            else {
                if (!headers.etag) {
                    logger.trackException({ exception: new Error('Continuation token from reading change feed is null or undefined') });
                }
                resolve({ items: results || [], continuationToken: headers.etag });
            }
        };
        queryIterator.executeNext(resultCallback);
    });
}
exports.readChangeFeed = readChangeFeed;
//# sourceMappingURL=changefeed.js.map