import { Writable } from 'stream';

export class MongoTransport extends Writable {
    private collectionName
    private client
    private collection

    constructor(options) {
        super({ objectMode: true });
        this.collectionName = options.collectionName;
        this.client = options.client;
        this.collection = this.client.collection(this.collectionName);
    }

    async _write(log, encoding, callback) {
        try {
            const logObject = JSON.parse(log)

            if (this.collection) {
                await this.collection.insertOne(logObject);
            }
            callback();
        } catch (err) {
            console.error('Error writing log to MongoDB:', err);
            callback(err);
        }
    }
}
