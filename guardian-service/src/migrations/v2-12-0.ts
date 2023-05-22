import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.12.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.retireRequestDocument();
    }

    /**
     * Change document hash to document id in retire requests
     */
    async retireRequestDocument() {
        const requestsCollection = this.getCollection('RetireRequest');
        const vcDocumentCollection = this.getCollection('VcDocument');
        const requests = requestsCollection.find({
            vcDocumentHash: { $ne: null }
        }, { session: this.ctx });
        while (await requests.hasNext()) {
            const request = await requests.next();
            const vcDocument = await vcDocumentCollection.findOne({
                hash: request.vcDocumentHash
            });
            if (!vcDocument) {
                continue;
            }
            await requestsCollection.updateOne(
                { _id: request._id },
                {
                    $set: {
                        documentId: vcDocument._id,
                    },
                },
                { session: this.ctx, upsert: false }
            );
        }
        await requestsCollection.updateMany(
            {},
            {
                $unset: {
                    vcDocumentHash: '',
                },
            }
        );
    }
}
