import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.17.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.removeContractsAndRequests();
    }

    /**
     * Remove contracts and requests
     */
    async removeContractsAndRequests() {
        const contractCollection =
            this.getCollection('Contract');
        const retireRequestCollection =
            this.getCollection('RetireRequest');
        await contractCollection.deleteMany();
        await retireRequestCollection.deleteMany();
    }
}