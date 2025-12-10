import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyActionType } from './policy-action.type.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyAction, Users } from '@guardian/common';

export class RelayerAccountAction {
    public static async request(options: {
        ref: AnyBlockType,
        user: PolicyUser,
        relayerAccount: {
            account: string;
            name: string;
            key: string;
            default: boolean;
        }
        userId: string | null
    }): Promise<any> {
        const { user, relayerAccount } = options;
        const data = {
            type: PolicyActionType.AddRelayerAccount,
            owner: user.did,
            relayerAccount: {
                name: relayerAccount.name,
                account: relayerAccount.account,
                key: relayerAccount.key,
            }
        };
        return data;
    }

    public static async complete(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ): Promise<boolean> {
        const data = row?.document;
        const relayerAccount = data?.relayerAccount;
        await (new Users()).createRelayerAccount({ did: user.did, id: userId }, relayerAccount, userId);
        return true;
    }
}
