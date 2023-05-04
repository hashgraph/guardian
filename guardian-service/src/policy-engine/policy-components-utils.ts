import { PolicyType } from '@guardian/interfaces';
import { Policy, DatabaseServer } from '@guardian/common';
import { IPolicyUser } from './policy-user';
import { ExternalEvent } from './interfaces/external-event';

/**
 * Policy component utils
 */
export class PolicyComponentsUtils {
    /**
     * Block update function
     */
    public static BlockUpdateFn: (uuid: string, user: IPolicyUser) => Promise<void>;
    /**
     * Block error function
     */
    public static BlockErrorFn: (blockType: string, message: any, user: IPolicyUser) => Promise<void>;
    /**
     * Update user info function
     */
    public static UpdateUserInfoFn: (user: IPolicyUser, policy: Policy) => Promise<void>;
    /**
     * External Event function
     */
    public static ExternalEventFn: (event: ExternalEvent<any>) => Promise<void>;

    /**
     * Get Policy Groups
     * @param policyId
     * @param user
     */
    public static async GetGroups(policyId: string, user: IPolicyUser): Promise<any[]> {
        return await new DatabaseServer().getGroupsByUser(policyId, user.did, {
            fields: ['uuid', 'role', 'groupLabel', 'groupName', 'active']
        });
    }

    /**
     * Get Policy Full Info
     * @param policy
     * @param did
     */
    public static async GetPolicyInfo(policy: Policy, did: string): Promise<Policy> {
        const result: any = policy;
        if (policy && did) {
            result.userRoles = [];
            result.userGroups = [];
            result.userRole = null;
            result.userGroup = null;

            const policyId = policy.id.toString();
            if (policy.status === PolicyType.DRY_RUN) {
                const activeUser = await DatabaseServer.getVirtualUser(policyId);
                if (activeUser) {
                    did = activeUser.did;
                }
            }

            if (policy.owner === did) {
                result.userRoles.push('Administrator');
                result.userRole = 'Administrator';
            }

            const dryRun = policy.status === PolicyType.DRY_RUN ? policyId : null;
            const db = new DatabaseServer(dryRun);
            const groups = await db.getGroupsByUser(policyId, did, {
                fields: ['uuid', 'role', 'groupLabel', 'groupName', 'active']
            });
            for (const group of groups) {
                if (group.active !== false) {
                    result.userRoles.push(group.role);
                    result.userRole = group.role;
                    result.userGroup = group;
                }
            }

            result.userGroups = groups;
            if (policy.status === PolicyType.PUBLISH) {
                const multiPolicy = await DatabaseServer.getMultiPolicy(policy.instanceTopicId, did);
                result.multiPolicyStatus = multiPolicy?.type;
            }
        } else {
            result.userRoles = ['No role'];
            result.userGroups = [];
            result.userRole = 'No role';
            result.userGroup = null;
        }

        if (!result.userRole) {
            result.userRoles = ['No role'];
            result.userRole = 'No role';
        }

        return result;
    }
}
