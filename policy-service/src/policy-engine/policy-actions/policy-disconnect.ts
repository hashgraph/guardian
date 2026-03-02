import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyActionType } from './policy-action.type.js';
import { PolicyAction } from '@guardian/common';
import { PolicyUser } from '../policy-user.js';

export class PolicyDisconnectAction {
    public static async request(options: {
        policyId: string,
        userId: string | null
    }): Promise<any> {
        const data = {
            type: PolicyActionType.DisconnectPolicy
        };
        return data;
    }

    public static async complete(
        row: PolicyAction,
        policyId: string,
        user: PolicyUser
    ): Promise<void> {
        await PolicyComponentsUtils.DisconnectPolicy(policyId, user.getAuthUser());
    }
}
