import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.23.1
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.updateMintRequests();
    }

    /**
     * Update mint requests
     */
    async updateMintRequests() {
        const mintRequestsCollection = this.getCollection('MintRequest');
        const tokenCollection = this.getCollection('Token');
        const mintRequests = mintRequestsCollection.find(
            {},
            { session: this.ctx }
        );
        while (await mintRequests.hasNext()) {
            const mintRequest = await mintRequests.next();
            const token = await tokenCollection.findOne({
                tokenId: mintRequest.tokenId,
            });
            if (token) {
                await mintRequestsCollection.updateOne(
                    { _id: mintRequest._id },
                    {
                        $set: {
                            tokenType: token.tokenType,
                            decimals: token.decimals,
                        },
                    },
                    { session: this.ctx, upsert: false }
                );
            }
        }
    }
}
