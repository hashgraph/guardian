import { Writable } from 'node:stream';
import { Db, Collection } from 'mongodb';

interface MongoTransportOptions {
    collectionName: string;
    client: Db;
}

/**
 * MongoDB transport
 */
export class MongoTransport extends Writable {
    private readonly collectionName: string;
    private readonly collection: Collection;
    private readonly client: Db;

    constructor(options: MongoTransportOptions) {
        super({ objectMode: true });
        this.collectionName = options.collectionName;
        this.client = options.client;
        this.collection = this.client.collection(this.collectionName);
    }

    /**
     * Insert log into MongoDB
     * @param log
     * @param encoding
     * @param callback
     */
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
