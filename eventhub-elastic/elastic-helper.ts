import { Client } from '@elastic/elasticsearch'
import moment from 'moment';
import _ from 'lodash';
import { getFormattedLog } from './log-parser'
import config from 'shared/config';
import * as logger from "shared/logger";
const client = new Client({
	node: config.elasticUrl,
	auth: {
		username: config.elasticUserName,
		password: config.elasticPassword
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
			logs.push(getFormattedLog(log));
		}
	}
	return await sendToElastic(logs);
}

async function sendToElastic(logs) {
	console.log(logs.length)
	if (logs.length == 0) {
		return []
	}
	const result = await client.helpers.bulk({
		datasource: logs,
		retries: 3,
		onDrop(doc) {
			logger.trackMetric({ name: 'dropper-message-count', value: 1 });
		},
		onDocument(doc: any) {
			doc = filterFields(doc)
			return {
				index: { _index: getIndex(doc) }
			}
		}
	})
	console.log(result)
	return result;
}

function filterFields(doc) {
	const remoteDepFileds = ['responseCode', 'result', 'target', 'durationMs', 'fullUrl', 'baseUrl', 'path', 'method'];
	const metricFileds = ['name', 'value'];
	const eventFields = ['name'];
	let filedsToRemove = [];
	if (doc.type == 'trace') {
		filedsToRemove = _.union(remoteDepFileds, metricFileds, eventFields);
	}
	else if (doc.type == 'metric') {
		filedsToRemove = _.union(remoteDepFileds);
	}
	else if (doc.type == 'event') {
		filedsToRemove = _.union(remoteDepFileds, ['value']);
	}
	else if (doc.type == 'remoteDependency') {
		filedsToRemove = _.union(metricFileds, eventFields);
	}
	for (const field of filedsToRemove) {
		delete doc[field];
	}
	return doc;
}
function getIndex(doc: any) {
	const year = moment(doc.log_timestamp).year();
	const month = moment(doc.log_timestamp).month();
	const week = moment(doc.log_timestamp).week();
	const date = moment(doc.log_timestamp).date();
	doc.envName = getEnvAndAppServiceNameForElastic(doc.appServiceName);
	if (!doc.type) {
		doc.type = 'trace'
	}
	else if (doc.type == 'event' && doc.message.indexOf('heartbeat') > -1) {
		doc.is_hb = true;
		return `logs-${doc.type}-${year}.${month}-${week}`
	}
	else if (doc.type == 'remoteDependency') {
		doc.type = 'remote-dep'
	}
	return `logs-${doc.type}-${year}.${month}-${week}-${date}`
}

function getEnvAndAppServiceNameForElastic(appServiceName) {
	if (!appServiceName) {
		return 'unknown';
	}
	else if (appServiceName.toLowerCase().indexOf('arimotorqdemo-app-service') > -1) {
		return 'arimotorqdemo'
	}
	else if (appServiceName.toLowerCase().indexOf('budget-app-service') > -1) {
		return 'budgetprod'
	}
	else if (appServiceName.toLowerCase().indexOf('clutchmotorqprod') > -1) {
        return 'clutchmotorqprod';
	}
	else if (appServiceName.toLowerCase().indexOf('clutch-app-service') > -1) {
        return 'clutchmotorqdemo';
    }
	else if (appServiceName.toLowerCase().indexOf('donlenmotorqdemo-app-service') > -1) {
		return 'donlenmotorqdemo'
	}
	else if (appServiceName.toLowerCase().indexOf('elementmotorqdemo-app-service') > -1) {
		return 'elementmotorqdemo'
	}
	else if (appServiceName.toLowerCase().indexOf('leaseplanmotorqdemo') > -1) {
		return 'leaseplanmotorqdemo'
	}
	else if (appServiceName.toLowerCase().indexOf('leonmotorqprod-app-service') > -1) {
        return 'leonmotorqprod';
    }
	else if (appServiceName.toLowerCase().indexOf('lynkd-app-service') > -1) {
		return 'lynkdmotorqdemo'
	}
	else if (appServiceName.toLowerCase().indexOf('mamo') > -1) {
		return 'mamo'
	}
	else if (appServiceName.toLowerCase().indexOf('merchantsmotorqdemo') > -1) {
        return 'merchantsmotorqdemo';
    }
    else if (appServiceName.toLowerCase().indexOf('merchantsmotorqprod') > -1) {
        return 'merchantsmotorqprod';
    }
	else if (appServiceName.toLowerCase().indexOf('mike') > -1) {
		return 'mike'
	}
	else if (appServiceName.toLowerCase().indexOf('seligmotorqdemo-app-service') > -1) {
		return 'seligmotorqdemo'
	}
	else if (appServiceName.toLowerCase().indexOf('tsd-app-service') > -1) {
		return 'tsdmotorqdemo'
	}
	else if (appServiceName.toLowerCase().indexOf('tsdmotorqprod') > -1) {
		return 'tsdmotorqprod'
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
export {
	processBatch
}