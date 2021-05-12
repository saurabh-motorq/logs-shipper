/* tslint:disable:typedef */
// tslint:disable tsr-detect-sql-literal-injection
import * as bluebirdPromise from "bluebird";
import * as azureStorage from "azure-storage";
import config from "./config";
import { _ } from "./lodash-mixins";
import * as logger from "./logger";



class TableStorage {
	private tableService;
	private entGen = azureStorage.TableUtilities.entityGenerator;
	private retryPolicy = new azureStorage.LinearRetryPolicyFilter(60, 30);
	constructor(connectionString?) {
		this.tableService = this.getTableService(connectionString);
	}

	static getDefaultInstance(){
		const tableStorage = new TableStorage();
		return tableStorage;
	}
	private getTableService(connectionString?) {
		let tableServiceToCreate = null;
		if (config.azureLocalStorage) {
			const devStoreCreds = azureStorage.generateDevelopmentStorageCredentials();
			tableServiceToCreate = azureStorage.createTableService(devStoreCreds).withFilter(this.retryPolicy);
		} else if (connectionString) {
			tableServiceToCreate = azureStorage.createTableService(connectionString).withFilter(this.retryPolicy);
		} else {
			tableServiceToCreate = azureStorage.createTableService().withFilter(this.retryPolicy);
		}
		bluebirdPromise.promisifyAll(tableServiceToCreate);
		return tableServiceToCreate;
	}

	public async initaliseTable(tableName) {
		await this.createTableIfNotExists(tableName);
	}

	public createTableIfNotExists(tableName) {
		return new Promise((resolve, reject) => {
			this.tableService.createTableIfNotExists(tableName, ((error, result) => {
				if (!error) {
					logger.trackTrace({ message: `${tableName} Table exists or created` });
					resolve(result);
				} else {
					logger.trackException({ exception: error });
					reject(error);
				}
			}));
		});
	}

	public createTableEntry(partitionKey, rowKey, propertiesAndValues) {
		const entry = {
			PartitionKey: this.entGen.String(partitionKey),
			RowKey: this.entGen.String(rowKey),
		};
		for (const property of Object.keys(propertiesAndValues)) {
			const value = propertiesAndValues[property];
			if (typeof value === "object") {
				throw new Error(`Unexpceted object for Property ${property}`);
			}
			entry[property] = value;
		}
		return entry;
	}

	public parseTableEntry(tableEntry) {
		try {
			return _.mapValues(tableEntry, entry => entry._);
		} catch (err) {
			logger.trackException({ exception: `Invalid format while deserializing data field in ${tableEntry}` });
			throw err;
		}
	}

	public async insertIntoTableStore(table, entity) {
		try {
			await this.tableService.insertEntityAsync(table, entity);
			logger.trackTrace({ message: `Entries inserted into ${table}` });
		} catch (err) {
			logger.trackException({ exception: err });
			throw err;
		}
	}

	public async upsertEntityIntoTableStore(table, entity) {
		try {
			await this.tableService.insertOrReplaceEntityAsync(table, entity);
			logger.trackTrace({ message: `Entries upserted into ${table}, entity = ${JSON.stringify(entity)}` });
		} catch (err) {
			logger.trackException({ exception: err });
			throw err;
		}
	}

	public async getAllEntries(tableName) {
		let entries = [];
		let contToken = null;
		do {
			const response = await this.tableService.queryEntitiesAsync(tableName, null, contToken);
			contToken = response.continuationToken;
			entries = entries.concat(response.entries.map(this.parseTableEntry));
		} while (contToken);
		return entries;
	}


	public async getEntity(tableName, partitionKey, rowKey) {
		try {
			console.log(tableName, partitionKey, rowKey)
			const content = await this.tableService.retrieveEntityAsync(tableName, partitionKey, rowKey);
			logger.trackTrace({ message: `Fetched entity in ${tableName} table with rowkey=${rowKey} and parititionkey=${partitionKey}` });
			return this.parseTableEntry(content);
		} catch (err) {
			logger.trackException({ exception: err });
			return null;
		}
	}

	public async getEntityByPartitionKey(tableName, parititionkey, whereConditions, propertiesToSelect?) {
		let entries = [];
		let contToken = null;
		try {
			let query = new azureStorage.TableQuery();
			if (propertiesToSelect) {
				query = query.select(propertiesToSelect);
			} else {
				query = query.select();
			}
			query = query.where("PartitionKey eq ?", parititionkey);
			for (const condition of whereConditions) {
				query = query.and(`${condition.columnName} ${condition.type} ?`, condition.value)
			}
			do {
				const response = await this.tableService.queryEntitiesAsync(tableName, query, contToken)
				contToken = response.continuationToken
				entries = entries.concat(response.entries.map(this.parseTableEntry))
			} while (contToken)
			return entries;
		}
		catch (err) {
			logger.trackException({ exception: err });
			throw err;
		}
	}

	public getDataFromTableEntry(tableEntry) {
		try {
			return JSON.parse(tableEntry.data);
		}
		catch (err) {
			logger.trackException({ exception: `Invalid format while deserializing data field in ${tableEntry}` })
			throw err;
		}
	}

	public async deleteTableStore(table, retryCount = 0) {
		const MAX_RETRIES = 5;
		if (retryCount === MAX_RETRIES) {
			throw new Error(`Could not delete ${table} from tableStorage after ${MAX_RETRIES} retries`);
		}
		try {
			await this.tableService.deleteTableIfExistsAsync(table);
			logger.trackTrace({ message: `${table} is be deleted` });
		} catch (error) {
			logger.trackException({ exception: error });
			if (error.code === 429 || error.code === 503) {
				setTimeout(this.deleteTableStore(table, retryCount + 1) as any, 0);
			} else {
				throw new Error(`Could not delete ${table} from tableStorage due to non-retriable error`);
			}
		}
	}

	public insertBatchTableEntry(tableName, tableEntries) {
		const batch = new azureStorage.TableBatch();
		tableEntries.forEach(entity => {
			batch.insertEntity(entity, null);
		});
		return new Promise((resolve, reject) => {
			this.tableService.executeBatch(tableName, batch, (error) => {
				if (!error) {
					logger.trackTrace({ message: 'Entries inserted into sourcedatacalamp' });
					resolve(batch.size());
				} else {
					logger.trackException({ exception: error });
					reject(error);
				}
			});
		});
	}

	public async getEntitiesAfterContinuationToken(tableName, changeFeedContinuationTokenInt) {
		let entries = [];
		let contToken = null;
		try {
			let query = new azureStorage.TableQuery();
			query = query.where("continuationToken gt ?", changeFeedContinuationTokenInt);
			do {
				const response = await this.tableService.queryEntitiesAsync(tableName, query, contToken)
				contToken = response.continuationToken
				entries = entries.concat(response.entries.map(this.parseTableEntry))
			} while (contToken)
			return entries;
		}
		catch (err) {
			logger.trackException({ exception: err });
			throw err;
		}
	}

	public async deleteEntity(tableName, partitionKey, rowKey) {
		const task = {
			PartitionKey: { '_': partitionKey },
			RowKey: { '_': rowKey }
		};
		try {
			await this.tableService.deleteEntityAsync(tableName, task);
		} catch (err) {
			logger.trackException({ exception: err });
			throw err;
		}
	} 
}

export { TableStorage };

