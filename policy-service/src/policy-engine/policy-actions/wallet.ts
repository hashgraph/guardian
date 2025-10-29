import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyActionType } from './policy-action.type.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyAction, Users } from '@guardian/common';

export class WalletAction {
    public static async local(options: {
        ref: AnyBlockType,
        user: PolicyUser,
        wallet: any
        userId: string | null
    }): Promise<void> {
        return;
    }

    public static async request(options: {
        ref: AnyBlockType,
        user: PolicyUser,
        wallet: {
            account: string;
            name: string;
            key: string;
            default: boolean;
        }
        userId: string | null
    }): Promise<any> {
        const { user, wallet } = options;
        const data = {
            type: PolicyActionType.AddWallet,
            owner: user.did,
            wallet: {
                name: wallet.name,
                account: wallet.account,
                key: wallet.key,
            }
        };
        return data;
    }

    public static async complete(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ): Promise<void> {
        try {
            const data = row?.document;
            const wallet = data?.wallet;
            await (new Users()).createWallet({ did: user.did, id: userId }, wallet, userId);
        } catch (error) {
            return;
        }
    }
}
