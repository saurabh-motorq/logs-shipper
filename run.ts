"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:typedef */
/*tslint:disable:no-console*/
const dotenv = require("dotenv");
dotenv.config();
if (process.env.DISABLE_MODULE_ALIAS !== 'true') {
    const moduleAlias = require('module-alias');
    moduleAlias.addAlias('shared', `${__dirname}/shared`);
}
else {
    require('tsconfig-paths').register();
}
import _ from 'lodash';

import * as blobPoller from './blob-poller/run';
import * as elasticProcessor from './eventhub-elastic/run'

main();
async function main() {
    const args = process.argv.slice(2);
    let processorName = process.env.WEBJOBS_NAME;
    if (!processorName && args.length === 0) {
        console.error("Either the WEBJOBS_NAME env variable should be set or the processor name should be passed as the 3rd argument.");
        return;
    }
    processorName = processorName || args[0];
    const finalSegmentInProcessorName = _.last(processorName.split("-"));
    const instanceId = parseInt(finalSegmentInProcessorName);

    if (processorName.includes('poller')) {
        blobPoller.run(instanceId);
    }
    else if (processorName.includes('processor')) {
        elasticProcessor.run(instanceId);
    }
}