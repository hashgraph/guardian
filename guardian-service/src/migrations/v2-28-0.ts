import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.28.0
 */
export class ReleaseMigration extends Migration{
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.updateSystemSchemas();
    }

    /**
     * Remove old schemas
     */
    async updateSystemSchemas(): Promise<void> {
        const schemaCollection = this.getCollection('Schema');
        await schemaCollection.deleteMany({
            system: true
        });
    }
}
