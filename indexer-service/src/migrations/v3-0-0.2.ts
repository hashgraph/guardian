import { Message, MessageCache } from '@indexer/common';
import { MessageAction, MessageStatus, MessageType } from '@indexer/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 3.0.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.updateVP();
    }

    /**
     * Update status
     */
    async updateVP() {
        const messageCollection = this.getCollection<Message>('Message');
        const cacheCollection = this.getCollection<MessageCache>('MessageCache');

        const messageRequests = messageCollection.find({
            type: MessageType.VP_DOCUMENT
        }, { session: this.ctx });

        while (await messageRequests.hasNext()) {
            const messageRequest = await messageRequests.next();
            if (messageRequest.action === MessageAction.CreateLabelDocument) {
                await messageCollection.deleteOne({
                    _id: messageRequest._id
                }, { session: this.ctx })
                await cacheCollection.updateOne(
                    { consensusTimestamp: messageRequest.consensusTimestamp },
                    {
                        $set: {
                            status: MessageStatus.COMPRESSED,
                        },
                    },
                    { session: this.ctx, upsert: false }
                );
            } else {
                await messageCollection.updateOne(
                    { _id: messageRequest._id },
                    {
                        $set: {
                            analytics: null,
                        },
                    },
                    { session: this.ctx, upsert: false }
                );
            }
        }
    }
}
