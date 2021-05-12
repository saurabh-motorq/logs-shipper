/* tslint:disable:typedef */
import * as logger from 'shared/logger';
import {TableStorage} from 'shared/table-storage';
const tableStorage = TableStorage.getDefaultInstance();
import config from "./config";

class KeyValueCheckpointer {
	public checkpointDocumentType: any;
	public checkpointId: any;
	public lastCheckpoint: any;

	constructor(checkpointId, checkpointDocumentType) {
		this.checkpointDocumentType = checkpointDocumentType;
		this.checkpointId = checkpointId;
	}

	public async init() {
		await tableStorage.initaliseTable(config.checkpointTable);
		await this.restoreLastCheckpoint();
	}

	public async checkpoint(value, lastRecordCreatedTime) {
		const item = {
			'value': value,
			'lastRecordCreatedTime': lastRecordCreatedTime,
		}
		const checkpointEntity = tableStorage.createTableEntry(this.checkpointDocumentType,
			this.checkpointId, {
				data: JSON.stringify(item)
			});
		await tableStorage.upsertEntityIntoTableStore(config.checkpointTable, checkpointEntity);
		this.lastCheckpoint = {
			value,
			lastRecordCreatedTime
		};
		logger.trackTrace({
			message: `Checkpointed value for ${this.checkpointId} : ${this.lastCheckpoint.value}`
		});
	}

	public async restoreLastCheckpoint() {
		const checkpointEntity = await tableStorage.getEntity(config.checkpointTable,
			this.checkpointDocumentType, this.checkpointId);
		let item = null;
		if (checkpointEntity) {
			item = tableStorage.getDataFromTableEntry(checkpointEntity);
		}
		if (item && item.value) {
			this.lastCheckpoint = {
				value: item.value,
				lastRecordCreatedTime: item.lastRecordCreatedTime
			}
		} else {
			this.lastCheckpoint = null;
		}
	}

	public getLastCheckpoint() {
		if (this.lastCheckpoint) {
			return this.lastCheckpoint;
		}
		return {};
	}
}

export { KeyValueCheckpointer };
