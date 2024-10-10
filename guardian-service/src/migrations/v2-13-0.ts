import { ConfigType } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.13.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.setupSuggestionsConfig();
    }

    /**
     * Setup suggestions config
     */
    async setupSuggestionsConfig() {
        const suggestionsConfigCollection =
            this.getCollection('SuggestionsConfig');
        const policyCollection = this.getCollection('Policy');
        const policiesByUsers = await policyCollection
            .aggregate([
                {
                    $group: {
                        _id: '$owner',
                        policyIds: {
                            $push: '$_id',
                        },
                    },
                },
            ])
            .toArray();
        for (const policiesByUser of policiesByUsers) {
            await suggestionsConfigCollection.insertOne({
                user: policiesByUser._id,
                items: policiesByUser.policyIds
                    .slice(0, 5)
                    .map((id, index) => ({
                        id,
                        index,
                        type: ConfigType.POLICY,
                    })),
            });
        }
    }
}
