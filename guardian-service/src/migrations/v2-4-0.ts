import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.4.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.renameAssignColumn();
        await this.updatingPolicyRoles();
    }

    /**
     * Rename assign column
     */
    async renameAssignColumn() {
        await this.getCollection('VcDocument').updateMany({}, { $rename: { assign: 'assignedTo'} }, { session: this.ctx });
        await this.getCollection('DryRun').updateMany({}, { $rename: { assign: 'assignedTo'} }, { session: this.ctx });
        await this.getCollection('AggregateVC').updateMany({}, { $rename: { assign: 'assignedTo'} }, { session: this.ctx });
    }

    /**
     * Updating policy roles
     */
    async updatingPolicyRoles() {
        const policiesCollection = this.getCollection('Policy');
        const policyRolesCollection = this.getCollection('PolicyRoles');
        const policies = policiesCollection.find({}, { session: this.ctx });
        while(await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.registeredUsers) {
                if (typeof policy.registeredUsers === 'object') {
                    const policyId = policy._id.toString();
                    const transactions = [];
                    const DIDs = Object.keys(policy.registeredUsers);
                    for (const did of DIDs) {
                        const role = policy.registeredUsers[did];
                        const currentRole = await policyRolesCollection.findOne({ policyId, did }, { session: this.ctx });
                        if (!currentRole) {
                            transactions.push({ policyId, did, role });
                        }
                    }
                    if (transactions.length) {
                        await policyRolesCollection.insertMany(transactions, { session: this.ctx });
                    }
                }
            }
        }
        await policiesCollection.updateMany({}, { $unset: { registeredUsers: '' } }, { session: this.ctx });
    }
}