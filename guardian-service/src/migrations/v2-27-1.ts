import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.27.1
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.setContractVersions();
    }

    /**
     * Set contract versions
     */
    async setContractVersions() {
        const contractsCollection = this.getCollection('Contract');
        contractsCollection.updateMany({}, {
            $set: {
                version: '1.0.0',
                wipeTokenIds: [],
            }
        }, {
            session: this.ctx
        });
    }
}
