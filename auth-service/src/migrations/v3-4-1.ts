import { Permissions, UserRole } from '@guardian/interfaces';
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
        const userCollection = this.getCollection('User');

        const srs = userCollection.find({ role: UserRole.STANDARD_REGISTRY }, { session: this.ctx });
        while (await srs.hasNext()) {
            const sr = await srs.next();

            const policyApproverRole = await roleCollection.findOne(
                { name: 'Policy Approver', owner: sr.did },
                { session: this.ctx }
            );

            if (!policyApproverRole) {
                continue;
            }

            await roleCollection.updateMany(
                { _id: policyApproverRole._id },
                { $addToSet: { permissions: Permissions.POLICIES_POLICY_TAG } },
                { session: this.ctx }
            );

            await userCollection.updateMany(
                {
                    role: UserRole.USER,
                    parent: sr.did,
                    'permissionsGroup.uuid': policyApproverRole.uuid,
                },
                { $addToSet: { permissions: Permissions.POLICIES_POLICY_TAG } },
                { session: this.ctx }
            );
        }
    }
}
