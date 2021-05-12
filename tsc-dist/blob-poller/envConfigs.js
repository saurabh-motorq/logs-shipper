"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = void 0;
require("dotenv").config();
const config = {};
exports.envConfig = config;
config.blobConfigs = [
    {
        storageAccount: process.env.WHEELS_STORAGE_ACCOUNT || 'wheelsmotorqprodlogs',
        storageKey: process.env.WHEELS_STORAGE_KEY,
        container: process.env.WHEELS_CONTAINER || "logs",
        folderPrefixes: ["wheelsmotorqprod-jobs1", "wheelsmotorqprod-jobs2"],
        fromDate: process.env.WHEELS_FROM_DATE || '2020-05-19T10:00:00.000Z',
        connectionString: process.env.WHEELS_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 0
    },
    {
        storageAccount: process.env.ARIDEMO_STORAGE_ACCOUNT || 'arimotorqdemostorage',
        storageKey: process.env.ARIDEMO_STORAGE_KEY,
        container: process.env.ARIDEMO_CONTAINER || "applicationlogs",
        folderPrefixes: ["arimotorqdemo-app-service"],
        fromDate: process.env.ARIDEMO_FROM_DATE || '2020-06-12T00:00:00.000Z',
        connectionString: process.env.ARIDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 0
    },
    {
        storageAccount: process.env.BUDGETPROD_STORAGE_ACCOUNT || 'budgetprodstorage',
        storageKey: process.env.BUDGETPROD_STORAGE_KEY,
        container: process.env.BUDGETPROD_CONTAINER || "budget-app-service",
        folderPrefixes: ["budget-app-service"],
        fromDate: process.env.BUDGETPROD_FROM_DATE || '2020-06-12T00:00:00.000Z',
        connectionString: process.env.BUDGETPROD_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 0
    },
    {
        storageAccount: process.env.MAMO_STORAGE_ACCOUNT || 'mamotorqprodstorage',
        storageKey: process.env.MAMO_STORAGE_KEY,
        container: process.env.MAMO_CONTAINER || "applicationlogs",
        folderPrefixes: ["mamotorqprod-jobs1"],
        fromDate: process.env.MAMO_FROM_DATE || '2020-06-25T00:00:00.000Z',
        connectionString: process.env.MAMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 0
    },
    {
        storageAccount: process.env.MIKEDEMO_STORAGE_ACCOUNT || 'mikealbertmotorqdemostor',
        storageKey: process.env.MIKEDEMO_STORAGE_KEY,
        container: process.env.MIKEDEMO_CONTAINER || "logs",
        folderPrefixes: ["mikealbertmotorqdemo/"],
        fromDate: process.env.MIKEDEMO_FROM_DATE || '2020-06-25T00:00:00.000Z',
        connectionString: process.env.MIKEDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.CLUTCHPROD_STORAGE_ACCOUNT || 'clutchmotorqprodstorage',
        storageKey: process.env.CLUTCHPROD_STORAGE_KEY,
        container: process.env.CLUTCHPROD_CONTAINER || "applicationlogs",
        folderPrefixes: ["clutchmotorqprod-jobs1"],
        fromDate: process.env.CLUTCHPROD_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.CLUTCHPROD_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.DONLENDEMO_STORAGE_ACCOUNT || 'donlenmotorqdemostorage',
        storageKey: process.env.DONLENDEMO_STORAGE_KEY,
        container: process.env.DONLENDEMO_CONTAINER || "applicationlogs",
        folderPrefixes: ["donlenmotorqdemo-app-service"],
        fromDate: process.env.DONLENDEMO_FROM_DATE || '2020-06-12T00:00:00.000Z',
        connectionString: process.env.DONLENDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.ELEMENTDEMO_STORAGE_ACCOUNT || 'elementmotorqdemostorage',
        storageKey: process.env.ELEMENTDEMO_STORAGE_KEY,
        container: process.env.ELEMENTDEMO_CONTAINER || "logs",
        folderPrefixes: ["elementmotorqdemo-app-service"],
        fromDate: process.env.ELEMENTDEMO_FROM_DATE || '2020-06-12T00:00:00.000Z',
        connectionString: process.env.ELEMENTDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.LEONPROD_STORAGE_ACCOUNT || 'leonmotorqprodstorage',
        storageKey: process.env.LEONPROD_STORAGE_KEY,
        container: process.env.LEONPROD_CONTAINER || "logs",
        folderPrefixes: ["leonmotorqprod-app-service"],
        fromDate: process.env.LEONPROD_FROM_DATE || '2020-06-12T00:00:00.000Z',
        connectionString: process.env.LEONPROD_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.LYNKDDEMO_STORAGE_ACCOUNT || 'lynkdlogs',
        storageKey: process.env.LYNKDDEMO_STORAGE_KEY,
        container: process.env.LYNKDDEMO_CONTAINER || "logs",
        folderPrefixes: ["lynkd-app-service"],
        fromDate: process.env.LYNKDDEMO_FROM_DATE || '2020-06-12T00:00:00.000Z',
        connectionString: process.env.LYNKDDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.SELIG_STORAGE_ACCOUNT || 'seligmotorqdemostorage',
        storageKey: process.env.SELIG_STORAGE_KEY,
        container: process.env.SELIG_CONTAINER || "applicationlogs",
        folderPrefixes: ["seligmotorqdemo-app-service"],
        fromDate: process.env.SELIG_FROM_DATE || '2020-06-12T00:00:00.000Z',
        connectionString: process.env.SELIG_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.MOTORQDEVNC_STORAGE_ACCOUNT || 'motorqcfapiv2dev',
        storageKey: process.env.MOTORQDEVNC_STORAGE_KEY,
        container: process.env.MOTORQDEVNC_CONTAINER || "logs",
        folderPrefixes: ["motorqcfapiv2dev-nc-appservice"],
        fromDate: process.env.MOTORQDEVNC_FROM_DATE || '2020-07-01T00:00:00.000Z',
        connectionString: process.env.MOTORQDEVNC_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.MOTORQDEVNC1_STORAGE_ACCOUNT || 'motorqcfapiv2devnc',
        storageKey: process.env.MOTORQDEVNC1_STORAGE_KEY,
        container: process.env.MOTORQDEVNC1_CONTAINER || "logs-geofenceqa",
        folderPrefixes: ["trippathtest-webjobs"],
        fromDate: process.env.MOTORQDEVNC1_FROM_DATE || '2020-07-01T00:00:00.000Z',
        connectionString: process.env.MOTORQDEVNC1_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 1
    },
    {
        storageAccount: process.env.MERCHANTSDEMO_STORAGE_ACCOUNT || 'merchantsmotorqdemo',
        storageKey: process.env.MERCHANTSDEMO_STORAGE_KEY,
        container: process.env.MERCHANTSDEMO_CONTAINER || "logs",
        folderPrefixes: ["merchantsmotorqdemo/"],
        fromDate: process.env.MERCHANTSDEMO_FROM_DATE || '2020-09-08T14:00:00.000Z',
        connectionString: process.env.MERCHANTSDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.MERCHANTSPROD_STORAGE_ACCOUNT || 'merchantsmotorqdemo',
        storageKey: process.env.MERCHANTSPROD_STORAGE_KEY,
        container: process.env.MERCHANTSPROD_CONTAINER || "logs",
        folderPrefixes: ["merchantsmotorqprod-webjobs"],
        fromDate: process.env.MERCHANTSPROD_FROM_DATE || '2020-09-08T14:00:00.000Z',
        connectionString: process.env.MERCHANTSPROD_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.TSDDEMO_STORAGE_ACCOUNT || 'tsdstorage',
        storageKey: process.env.TSDDEMO_STORAGE_KEY,
        container: process.env.TSDDEMO_CONTAINER || "logs",
        folderPrefixes: ["tsd-app-service/"],
        fromDate: process.env.TSDDEMO_FROM_DATE || '2020-09-08T00:00:00.000Z',
        connectionString: process.env.TSDDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.TSDPROD_STORAGE_ACCOUNT || 'tsdmotorqprodstorage',
        storageKey: process.env.TSDPROD_STORAGE_KEY,
        container: process.env.TSDPROD_CONTAINER || "logs",
        folderPrefixes: ["tsdmotorqprod-jobs1"],
        fromDate: process.env.TSDPROD_FROM_DATE || '2020-09-08T00:00:00.000Z',
        connectionString: process.env.TSDPROD_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.CLUTCHDEMO_STORAGE_ACCOUNT || 'clutchdemologs',
        storageKey: process.env.CLUTCHDEMO_STORAGE_KEY,
        container: process.env.CLUTCHDEMO_CONTAINER || "logs",
        folderPrefixes: ["clutch-app-service"],
        fromDate: process.env.CLUTCHDEMO_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.CLUTCHDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.LEASEPLANDEMO_STORAGE_ACCOUNT || 'motorqdemostorageeastus',
        storageKey: process.env.LEASEPLANDEMO_STORAGE_KEY,
        container: process.env.LEASEPLANDEMO_CONTAINER || "logs",
        folderPrefixes: ["leaseplanmotorqdemo"],
        fromDate: process.env.LEASEPLANDEMO_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.LEASEPLANDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.WHEELSQA_STORAGE_ACCOUNT || 'wfleetqa',
        storageKey: process.env.WHEELSQA_STORAGE_KEY,
        container: process.env.WHEELSQA_CONTAINER || "logs",
        folderPrefixes: ["wfleetqaapi"],
        fromDate: process.env.WHEELSQA_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.WHEELSQA_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.SUNPOWERPROD_STORAGE_ACCOUNT || 'sunpowerprodstorage',
        storageKey: process.env.SUNPOWERPROD_STORAGE_KEY,
        container: process.env.SUNPOWERPROD_CONTAINER || "logs",
        folderPrefixes: ["sunpowercfapiv2", "sunpowerfmcaapi"],
        fromDate: process.env.SUNPOWERPROD_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.SUNPOWERPROD_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.CARLIQDEMO_STORAGE_ACCOUNT || 'carliqmotorqdemostorage',
        storageKey: process.env.CARLIQDEMO_STORAGE_KEY,
        container: process.env.CARLIQDEMO_CONTAINER || "logs",
        folderPrefixes: [""],
        fromDate: process.env.CARLIQDEMO_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.CARLIQDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    // {
    //     storageAccount: process.env.EMKAYDEMO_STORAGE_ACCOUNT || 'emkaymotorqdemologs',
    //     storageKey: process.env.EMKAYDEMO_STORAGE_KEY,
    //     container: process.env.EMKAYDEMO_CONTAINER || "logs",
    //     folderPrefixes: ["emkaymotorqdemoapi"],
    //     fromDate: process.env.EMKAYDEMO_FROM_DATE || '2020-06-19T00:00:00.000Z', // we missed configuring this storage
    //     connectionString: process.env.EMKAYDEMO_CONNECTION_STRING,
    //     tableStorage: null,
    //     eventHubOutputStream: null,
    //     blobStream: null,
    //     instanceId:2
    // }
    {
        storageAccount: process.env.UNIONDEMO_STORAGE_ACCOUNT || 'unionmotorqdemologs',
        storageKey: process.env.UNIONDEMO_STORAGE_KEY,
        container: process.env.UNIONDEMO_CONTAINER || "logs",
        folderPrefixes: ["unionmotorqdemo"],
        fromDate: process.env.UNIONDEMO_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.UNIONDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    },
    {
        storageAccount: process.env.WEXDEMO_STORAGE_ACCOUNT || 'unionmotorqdemologs',
        storageKey: process.env.WEXDEMO_STORAGE_KEY,
        container: process.env.WEXDEMO_CONTAINER || "logs",
        folderPrefixes: ["wexmotorqdemo-app-service"],
        fromDate: process.env.WEXDEMO_FROM_DATE || '2020-06-19T00:00:00.000Z',
        connectionString: process.env.WEXDEMO_CONNECTION_STRING,
        tableStorage: null,
        eventHubOutputStream: null,
        blobStream: null,
        instanceId: 2
    }
];
//# sourceMappingURL=envConfigs.js.map