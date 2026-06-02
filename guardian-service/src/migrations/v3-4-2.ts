import { PolicyCategoryType } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 3.4.2
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        const categoriesCollection = this.getCollection('policy_category');
        const typoName = 'GHG distruction';
        const correctName = 'GHG destruction';
        const type = PolicyCategoryType.MITIGATION_ACTIVITY_TYPE;

        const typoEntry = await categoriesCollection.findOne({ name: typoName, type });

        if (typoEntry) {
            const correctEntry = await categoriesCollection.findOne({ name: correctName, type });

            if (correctEntry) {

                // If the correct entry already exists (e.g. manually fixed), delete the typo duplicate
                await categoriesCollection.deleteOne({ _id: typoEntry._id });
            } else {

                // Otherwise, correct the typo
                await categoriesCollection.updateOne(
                    { _id: typoEntry._id },
                    { $set: { name: correctName } }
                );
            }
        }
    }
}
