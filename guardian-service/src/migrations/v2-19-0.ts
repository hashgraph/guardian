import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.19.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.removeVpHashIndex();
    }

    /**
     * Remove vp hash index
     */
    async removeVpHashIndex() {
        const vpDocumentCollection = this.getCollection('VpDocument');
        try {
            vpDocumentCollection.dropIndex('hash_1');
        } catch (error) {
            console.log(error);
        }
    }
}