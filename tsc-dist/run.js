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
const lodash_1 = __importDefault(require("lodash"));
const blobPoller = __importStar(require("./blob-poller/run"));
const elasticProcessor = __importStar(require("./eventhub-elastic/run"));
main();
async function main() {
    const args = process.argv.slice(2);
    let processorName = process.env.WEBJOBS_NAME;
    if (!processorName && args.length === 0) {
        console.error("Either the WEBJOBS_NAME env variable should be set or the processor name should be passed as the 3rd argument.");
        return;
    }
    processorName = processorName || args[0];
    const finalSegmentInProcessorName = lodash_1.default.last(processorName.split("-"));
    const instanceId = parseInt(finalSegmentInProcessorName);
    if (processorName.includes('poller')) {
        blobPoller.run(instanceId);
    }
    else if (processorName.includes('processor')) {
        elasticProcessor.run(instanceId);
    }
}
//# sourceMappingURL=run.js.map