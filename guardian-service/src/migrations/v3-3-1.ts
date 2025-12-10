import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 3.3.1
 */
export class FileMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.updateFileIndex();
    }

    /**
     * Remove old schemas
     */
    async updateFileIndex(): Promise<void> {
        const chunks = this.getCollection('fs.chunks');
        await chunks.createIndex({ files_id: 1 }, { sparse: true, name: 'files_id_index' });
    }
}
