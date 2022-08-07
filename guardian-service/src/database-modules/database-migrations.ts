import { DataBaseHelper, Logger } from '@guardian/common';
import { Policy } from '@entity/policy';
import { PolicyRoles } from '@entity/policy-roles';

/**
 * Database migrations
 */
export class DatabaseMigrations {
    /**
     * Database Migrations
     */
    public static async runMigrations() {
        const policies = await new DataBaseHelper(Policy).findAll();
        for (const policy of policies) {
            try {
                if (policy.registeredUsers) {
                    console.log(`Update policy ${policy.id}`);
                    if (typeof policy.registeredUsers === 'object') {
                        const policyId = policy.id.toString();
                        const transactions: PolicyRoles[] = [];
                        const DIDs = Object.keys(policy.registeredUsers);
                        for (const did of DIDs) {
                            const role = policy.registeredUsers[did];
                            const currentRole = await new DataBaseHelper(PolicyRoles).findOne({ policyId, did });
                            if (!currentRole) {
                                transactions.push(new DataBaseHelper(PolicyRoles).create({ policyId, did, role }));
                                console.log(`Created role for ${did}`);
                            }
                        }
                        if (transactions.length) {
                            await new DataBaseHelper(PolicyRoles).save(transactions);
                        }
                    }
                    policy.registeredUsers = undefined;
                    await new DataBaseHelper(Policy).update(policy);
                }
            } catch (error) {
                console.log(error);
                new Logger().error(error, ['GUARDIAN_SERVICE', 'Migrations']);
            }
        }
    }
}