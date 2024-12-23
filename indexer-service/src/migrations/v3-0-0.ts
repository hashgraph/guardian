import { Message, MessageCache } from '@indexer/common';
import { MessageStatus } from '@indexer/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 3.0.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.updateStatus();
        await this.updateMessageIndexes();
    }

    /**
     * Update status
     */
    async updateStatus() {
        const cacheCollection = this.getCollection<MessageCache>('MessageCache');
        const cacheRequests = cacheCollection.find({
            status: MessageStatus.UNSUPPORTED
        }, { session: this.ctx });
        while (await cacheRequests.hasNext()) {
            const cacheRequest = await cacheRequests.next();
            await cacheCollection.updateOne(
                { _id: cacheRequest._id },
                {
                    $set: {
                        status: MessageStatus.COMPRESSED,
                    },
                },
                { session: this.ctx, upsert: false }
            );
        }
    }

    /**
     * Update indexes
     */
    async updateMessageIndexes() {
        const messageCollection = this.getCollection<Message>('Message');
        const cacheCollection = this.getCollection<MessageCache>('MessageCache');

        const indexMap = new Map<string, number>();

        const cacheRequests = cacheCollection.find({}, { session: this.ctx });
        while (await cacheRequests.hasNext()) {
            const cacheRequest = await cacheRequests.next();
            indexMap.set(cacheRequest.consensusTimestamp, cacheRequest.sequenceNumber)
        }

        const messageRequests = messageCollection.find({}, { session: this.ctx });
        while (await messageRequests.hasNext()) {
            const messageRequest = await messageRequests.next();
            const links = messageRequest.files?.length || 0;
            const files = messageRequest.documents?.length || 0;
            await messageCollection.updateOne(
                { _id: messageRequest._id },
                {
                    $set: {
                        sequenceNumber: indexMap.get(messageRequest.consensusTimestamp),
                        loaded: links === files,
                        lastUpdate: 0
                    },
                },
                { session: this.ctx, upsert: false }
            );
        }
    }
}
