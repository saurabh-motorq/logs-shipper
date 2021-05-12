//import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient, BlobClient } from "@azure/storage-blob"
import * as AzureStorageBlob from "@azure/storage-blob"
import moment from 'moment';

async function main() {
    const accountName = 'wheelsmotorqprodlogs';
    const accountKey = 'sIcG7IQiBB5fKA0ImDCidwXgUy4nJqmliNbUgdCRBsPJew872mas4cII9oqcZ2M6zEIPe+cP6TCsDpFYZsJD4g=='
    const sharedKeyCredential = new AzureStorageBlob.StorageSharedKeyCredential(accountName ,accountKey);
    const blobServiceClient = new AzureStorageBlob.BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            sharedKeyCredential
        );
    const containerClient = blobServiceClient.getContainerClient('logs');
    const token = '2!160!MDAwMDc1IWVsZW1lbnRtb3RvcnFkZW1vLWFwcC1zZXJ2aWNlLzIwMjAvMDYvMTcvMDMvOGVhYzFlLTE4NDA4LmFwcGxpY2F0aW9uTG9nLmNzdiEwMDAwMjghOTk5OS0xMi0zMVQyMzo1OTo1OS45OTk5OTk5WiE-';
    const iter = await containerClient.listBlobsFlat({prefix:getStartDate()}).byPage({maxPageSize: 10 })
    console.log(iter)
     const res = await iter.next()
    //  console.log(JSON.stringify(res,null,4))
     console.log(res.value.segment.blobItems)
    //  console.log(res.value.segment.Blob.Name)
    //  const blobClient = containerClient.getBlobClient(res.value.segment.Blob.Name);
    //  console.log(await blobClient.getProperties());
}

const startDate = '2020-11-04T18:00:00.000Z';
const instanceName = 'wheelsmotorqprod-jobs1';
function isTokenPresentForInstance(){
    return false;
}

function getStartDate(){
    const startDateMoment = moment.utc(startDate);
    return `${instanceName}/${startDateMoment.year()}/${startDateMoment.month()+1}/0${startDateMoment.date()}/${startDateMoment.hour()}`
}

console.log(getStartDate())
main()