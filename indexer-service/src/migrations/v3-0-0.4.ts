import { ProjectCoordinates } from '@indexer/common';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 3.0.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.dropProjectLocations();
    }

    /**
     * Update indexes
     */
    async dropProjectLocations() {
        const messageCollection = this.getCollection<ProjectCoordinates>('ProjectCoordinates');
        messageCollection.drop();
    }
}
