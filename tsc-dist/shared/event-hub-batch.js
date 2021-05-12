"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHubBatch = void 0;
class EventHubBatch {
    constructor(maxBatchSize) {
        this.maxBatchSize = maxBatchSize;
        this.currentBatchSize = 0;
        this._messages = [];
    }
    tryAdd(message) {
        const messageString = JSON.stringify(message);
        const messageSize = messageString.length * 2;
        let result = false;
        if (this.currentBatchSize + messageSize <= this.maxBatchSize) {
            this._messages.push(message);
            this.currentBatchSize += messageSize;
            result = true;
        }
        return result;
    }
    get count() {
        return this._messages.length;
    }
    get messages() {
        return this._messages.map(message => { return { body: message }; });
    }
}
exports.EventHubBatch = EventHubBatch;
//# sourceMappingURL=event-hub-batch.js.map