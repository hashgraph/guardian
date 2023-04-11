import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.9.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.renameDocumentStateColumn();
    }

    /**
     * Rename document state column
     */
    async renameDocumentStateColumn() {
        const stateCollection = this.getCollection('DocumentState');
        await stateCollection.updateMany(
            {},
            {
                $rename: {
                    'created': 'createdOn'
                },
            },
            { session: this.ctx, upsert: false }
        );
    }
}
