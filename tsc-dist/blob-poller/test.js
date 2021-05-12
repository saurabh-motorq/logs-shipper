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
//import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient, BlobClient } from "@azure/storage-blob"
const AzureStorageBlob = __importStar(require("@azure/storage-blob"));
const moment_1 = __importDefault(require("moment"));
async function main() {
    const accountName = 'wheelsmotorqprodlogs';
    const accountKey = 'sIcG7IQiBB5fKA0ImDCidwXgUy4nJqmliNbUgdCRBsPJew872mas4cII9oqcZ2M6zEIPe+cP6TCsDpFYZsJD4g==';
    const sharedKeyCredential = new AzureStorageBlob.StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new AzureStorageBlob.BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient('logs');
    const token = '2!160!MDAwMDc1IWVsZW1lbnRtb3RvcnFkZW1vLWFwcC1zZXJ2aWNlLzIwMjAvMDYvMTcvMDMvOGVhYzFlLTE4NDA4LmFwcGxpY2F0aW9uTG9nLmNzdiEwMDAwMjghOTk5OS0xMi0zMVQyMzo1OTo1OS45OTk5OTk5WiE-';
    const iter = await containerClient.listBlobsFlat({ prefix: getStartDate() }).byPage({ maxPageSize: 10 });
    console.log(iter);
    const res = await iter.next();
    //  console.log(JSON.stringify(res,null,4))
    console.log(res.value.segment.blobItems);
    //  console.log(res.value.segment.Blob.Name)
    //  const blobClient = containerClient.getBlobClient(res.value.segment.Blob.Name);
    //  console.log(await blobClient.getProperties());
}
const startDate = '2020-11-04T18:00:00.000Z';
const instanceName = 'wheelsmotorqprod-jobs1';
function isTokenPresentForInstance() {
    return false;
}
function getStartDate() {
    const startDateMoment = moment_1.default.utc(startDate);
    return `${instanceName}/${startDateMoment.year()}/${startDateMoment.month() + 1}/0${startDateMoment.date()}/${startDateMoment.hour()}`;
}
console.log(getStartDate());
main();
//# sourceMappingURL=test.js.map