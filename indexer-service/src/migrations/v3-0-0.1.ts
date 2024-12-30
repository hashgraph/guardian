import { MessageCache } from '@indexer/common';
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
}
