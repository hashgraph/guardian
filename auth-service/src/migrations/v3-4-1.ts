import { Permissions } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 3.4.1
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.addPolicyTagPermission();
    }

    /**
     * Add Policy Tag permission
     */
    async addPolicyTagPermission() {
        const roleCollection = this.getCollection('DynamicRole');

        await roleCollection.updateMany(
            { name: 'Policy Approver' },
            { $addToSet: { permissions: Permissions.POLICIES_POLICY_TAG } },
            { session: this.ctx }
        );
    }
}
