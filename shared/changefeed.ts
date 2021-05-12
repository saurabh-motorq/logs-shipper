/* tslint:disable:typedef */
require("dotenv").config();
import { DocumentBase, DocumentClient } from "documentdb";
import config from "./config";
import { _ } from "./lodash-mixins";
import * as logger from "./logger";
import { DBCollection } from "./enums";

const connectionPolicy = new DocumentBase.ConnectionPolicy();
if (_.startsWith(config.endpoint.toLowerCase(), "https://localhost:8081")) {
	connectionPolicy.DisableSSLVerification = true;
}

connectionPolicy.RetryOptions = {
	MaxRetryAttemptCount: 9,
	MaxWaitTimeInSeconds: 30
};
const client = new DocumentClient(config.endpoint,
	{ "masterKey": config.primaryKey },
	connectionPolicy);
const databaseUrl = `dbs/${config.database.id}`;
const telematicsCollectionUrl = `${databaseUrl}/colls/${config.collection.telematicsId}`;
const entitiesCollectionUrl = `${databaseUrl}/colls/${config.collection.entitiesId}`;
const referenceDataCollectionUrl = `${databaseUrl}/colls/${config.collection.referenceDataId}`;

async function getChangeFeed(contToken, collection: DBCollection): Promise<any> {
	if(collection === DBCollection.Entity) {
		return getChangeFeedPrivate(contToken, entitiesCollectionUrl, null);
	} else if (collection === DBCollection.ReferenceData) {
		return getChangeFeedPrivate(contToken, referenceDataCollectionUrl, null);
	} else {
		throw new Error(`Unsupported collection type`);
	}
}

function getChangeFeedPrivate(contToken: any, collectionUrl: string, partitionKey?: string) {
	const options = {
		a_im: "Incremental feed",
		accessCondition: {
			type: "IfNoneMatch",
			condition: contToken
		},
		maxItemCount: config.changeFeedMaxItemCount,
	} as any;
	if (!_.isUndefined(partitionKey)) {
		options.partitionKey = partitionKey
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
		partitionKeyRangesIterator.toArray((err: any, resources: any) => {
			if (err) {
				reject(err);
			}
			const ranges = discardGoneRanges(resources);
			resolve(ranges);
		});
	});
}

function getCollectionUrlFromCollectionName(collection: string) {
	if (collection.toLowerCase().includes('telematics')) {
		return telematicsCollectionUrl;
	}
	else if (collection.toLowerCase().includes('entities')) {
		return entitiesCollectionUrl
	}
	else if (collection.toLowerCase().includes('reference-data')) {
		return referenceDataCollectionUrl
	}
	else throw new Error(`${collection} not present in cosmos db. Collecion name should be name of a container`)
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

async function readChangeFeed(partitionKeyRangeId, maxItemCount, continuationToken,collection?) {
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
				logger.trackException({ exception: error })
				reject(error);
			}
			else {
				if (!headers.etag) {
					logger.trackException({ exception: new Error('Continuation token from reading change feed is null or undefined') })
				}
				resolve({ items: results || [], continuationToken: headers.etag });
			}
		}
		queryIterator.executeNext(resultCallback);
	})
}

export {
	getChangeFeed,
	readChangeFeed,
	discardGoneRanges,
	getPartitionKeyRanges
};

