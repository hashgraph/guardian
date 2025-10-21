import { Permissions, PolicyHelper, PolicyStatus } from '@guardian/interfaces';
import { DatabaseServer, IAuthUser, Policy } from '@guardian/common';
import { IPolicyUser } from './policy-user.js';
import { ExternalEvent } from './interfaces/external-event.js';

/**
 * Policy component utils
 */
export class PolicyComponentsUtils {
    /**
     * Block update function
     */
    public static BlockUpdateFn: (uuid: string[], user: IPolicyUser) => Promise<void>;
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
    public static async GetPolicyInfo(
        policy: Policy,
        user: IAuthUser
    ): Promise<Policy> {
        if (!policy) {
            return policy;
        }
        const result: any = policy;
        const policyId = policy.id.toString();

        let did = user.did;
        let permissions = user.permissions || [];
        if (did) {
            result.userRoles = [];
            result.userGroups = [];
            result.userRole = null;
            result.userGroup = null;

            if (PolicyHelper.isDryRunMode(policy)) {
                const activeUser = await DatabaseServer.getVirtualUser(policyId);
                if (activeUser && did !== activeUser.did) {
                    did = activeUser.did;
                    permissions = [];
                }
            }

            if (policy.owner === did || permissions.includes(Permissions.POLICIES_POLICY_MANAGE)) {
                result.userRoles.push('Administrator');
                result.userRole = 'Administrator';
            }

            const dryRun = PolicyHelper.isDryRunMode(policy) ? policyId : null;
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

            if (!result.userRole) {
                result.userRoles = ['No role'];
                result.userRole = 'No role';
            }

            result.userGroups = groups;
            if (policy.status === PolicyStatus.PUBLISH || policy.status === PolicyStatus.DISCONTINUED) {
                const multiPolicy = await DatabaseServer.getMultiPolicy(policy.instanceTopicId, did);
                result.multiPolicyStatus = multiPolicy?.type;
            }
        } else {
            result.userRoles = ['No role'];
            result.userGroups = [];
            result.userRole = 'No role';
            result.userGroup = null;
        }

        result.tests = await DatabaseServer.getPolicyTests(policyId);

        return result;
    }

    /**
     * Get Policy Full Info
     * @param policy
     * @param did
     */
    public static async GetUserRole(
        policy: Policy,
        user: IAuthUser
    ): Promise<string> {
        if (!policy) {
            return 'No role';
        }

        const policyId = policy.id.toString();

        let result: string = null;
        let did = user.did;
        let permissions = user.permissions || [];
        if (did) {
            if (PolicyHelper.isDryRunMode(policy)) {
                const activeUser = await DatabaseServer.getVirtualUser(policyId);
                if (activeUser && did !== activeUser.did) {
                    did = activeUser.did;
                    permissions = [];
                }
            }

            if (policy.owner === did || permissions.includes(Permissions.POLICIES_POLICY_MANAGE)) {
                result = 'Administrator';
            }

            const dryRun = PolicyHelper.isDryRunMode(policy) ? policyId : null;
            const db = new DatabaseServer(dryRun);
            const groups = await db.getGroupsByUser(policyId, did, {
                fields: ['uuid', 'role', 'groupLabel', 'groupName', 'active']
            });
            for (const group of groups) {
                if (group.active !== false) {
                    result = group.role;
                }
            }

            if (!result) {
                result = 'No role';
            }
        } else {
            result = 'No role';
        }

        return result;
    }
}
