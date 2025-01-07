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

        const vps = messageCollection.find({
            type: MessageType.VP_DOCUMENT
        }, { session: this.ctx });

        while (await vps.hasNext()) {
            const vp = await vps.next();
            if (vp.action === MessageAction.CreateLabelDocument) {
                //Label VP
                await messageCollection.deleteOne({
                    _id: vp._id
                }, { session: this.ctx })
                await cacheCollection.updateOne(
                    { consensusTimestamp: vp.consensusTimestamp },
                    {
                        $set: {
                            status: MessageStatus.COMPRESSED,
                        },
                    },
                    { session: this.ctx, upsert: false }
                );
            } else {
                //Other VP
                await messageCollection.updateOne(
                    { _id: vp._id },
                    {
                        $set: {
                            analytics: null,
                        },
                    },
                    { session: this.ctx, upsert: false }
                );
            }
        }

        const labels = messageCollection.find({
            type: MessageType.POLICY_LABEL
        }, { session: this.ctx });
        while (await labels.hasNext()) {
            const label = await labels.next();
            await messageCollection.updateOne(
                { _id: label._id },
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
