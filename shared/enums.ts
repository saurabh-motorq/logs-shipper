enum BlobFetchType {
    Stream,
    Text
}

export enum DBCollection {
	Entity = "Entity",
	ReferenceData = "ReferenceData",
	Telematics = "Telematics"
}

enum CheckpointerType {
	KeyValue,
	ProcessedOffset
}

enum DocType {
	EVENTHUBOFFSET = 'EVENTHUBOFFSET'
}

enum strings {
	offset = 'offset',
	OFFSET = 'OFFSET',
	EVENTHUB = 'EVENTHUB',
	ARCHIVER = 'ARCHIVER'
}

export {
    BlobFetchType,
    CheckpointerType,
    DocType,
    strings
}