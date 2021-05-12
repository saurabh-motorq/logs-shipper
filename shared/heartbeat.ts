import moment from 'moment';
import config from './config';
import * as logger from "./logger";
import {TableStorage} from "./table-storage";
const heartbeatTableStorage = new TableStorage(config.heartBeatTableStorageConnectionString)
const heartbeatState = {};

function emit(prefix) {
	if (canEmitHeartbeat(prefix)) {
		logger.trackEvent({ name: `${prefix} heartbeat` });
		heartbeatState[prefix] = moment();
		if(config.shouldEmitHBToTableStore){
			emitHeartbeatToTableStore(prefix);
		}
	}
}

function emitHeartbeatToTableStore(prefix){
	try {
		const partitionKey = config.customerName;
		const rowKey = `${prefix} heartbeat`;
		const tableEntry = heartbeatTableStorage.createTableEntry(partitionKey, rowKey, {});
		heartbeatTableStorage.upsertEntityIntoTableStore(config.heartBeatTable,tableEntry);
	} catch(exception) {
		exception.message = `Heartbeat tablestore exception; ${exception.message}`;
		logger.trackException({ exception });
	}
}

function canEmitHeartbeat(prefix) {
	if (heartbeatState[prefix]) {
		return moment().diff(heartbeatState[prefix], 'milliseconds') >= config.heartbeatIntervalMilliseconds;
	}
	return true;
}

export { emit };

