"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strings = exports.DocType = exports.CheckpointerType = exports.BlobFetchType = exports.DBCollection = void 0;
var BlobFetchType;
(function (BlobFetchType) {
    BlobFetchType[BlobFetchType["Stream"] = 0] = "Stream";
    BlobFetchType[BlobFetchType["Text"] = 1] = "Text";
})(BlobFetchType || (BlobFetchType = {}));
exports.BlobFetchType = BlobFetchType;
var DBCollection;
(function (DBCollection) {
    DBCollection["Entity"] = "Entity";
    DBCollection["ReferenceData"] = "ReferenceData";
    DBCollection["Telematics"] = "Telematics";
})(DBCollection = exports.DBCollection || (exports.DBCollection = {}));
var CheckpointerType;
(function (CheckpointerType) {
    CheckpointerType[CheckpointerType["KeyValue"] = 0] = "KeyValue";
    CheckpointerType[CheckpointerType["ProcessedOffset"] = 1] = "ProcessedOffset";
})(CheckpointerType || (CheckpointerType = {}));
exports.CheckpointerType = CheckpointerType;
var DocType;
(function (DocType) {
    DocType["EVENTHUBOFFSET"] = "EVENTHUBOFFSET";
})(DocType || (DocType = {}));
exports.DocType = DocType;
var strings;
(function (strings) {
    strings["offset"] = "offset";
    strings["OFFSET"] = "OFFSET";
    strings["EVENTHUB"] = "EVENTHUB";
    strings["ARCHIVER"] = "ARCHIVER";
})(strings || (strings = {}));
exports.strings = strings;
//# sourceMappingURL=enums.js.map