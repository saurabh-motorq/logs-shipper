class EventHubBatch {
	private maxBatchSize: number;
	private _messages: Array<any>;
	private currentBatchSize: number;

	constructor(maxBatchSize) {
		this.maxBatchSize = maxBatchSize;
		this.currentBatchSize = 0;
		this._messages = [];
	}

	tryAdd(message): boolean {
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
		return this._messages.map(message => { return { body: message } });
	}
}

export { EventHubBatch }
