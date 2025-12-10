import { PolicyAction, Token } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class DissociateToken {
    public static async local(options: {
        ref: AnyBlockType,
        token: Token,
        user: string,
        relayerAccount: string,
        userId: string | null
    }): Promise<boolean> {
        const { ref, token, user, relayerAccount, userId } = options;
        const userCred = await PolicyUtils.getUserCredentials(ref, user, userId);
        const userRelayerAccount = await userCred.loadRelayerAccount(ref, relayerAccount, userId);
        return await PolicyUtils.dissociate(ref, token, userRelayerAccount, userId);
    }

    public static async request(options: {
        ref: AnyBlockType,
        token: Token,
        user: string,
        relayerAccount: string,
        userId: string | null
    }): Promise<any> {
        const { ref, token, user, relayerAccount, userId } = options;
        const userAccount = await PolicyUtils.getHederaAccountId(ref, user, userId);
        const data = {
            uuid: GenerateUUIDv4(),
            owner: user,
            accountId: userAccount,
            relayerAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.DissociateToken,
                owner: user,
                token: {
                    tokenId: token.tokenId,
                    tokenName: token.tokenName,
                    tokenSymbol: token.tokenSymbol,
                    tokenType: token.tokenType
                }
            }
        };
        return data;
    }

    public static async response(options: {
        row: PolicyAction,
        user: PolicyUser,
        relayerAccount: string,
        userId: string | null
    }) {
        const { row, user, relayerAccount, userId } = options;
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const { token } = data;

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userRelayerAccount = await userCred.loadRelayerAccount(ref, relayerAccount, userId);
        const dissociate = await PolicyUtils.dissociate(ref, token, userRelayerAccount, userId);

        return {
            type: PolicyActionType.DissociateToken,
            owner: user.did,
            token,
            dissociate
        };
    }

    public static async complete(
        row: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        const data = row.document;
        const { dissociate } = data;
        return !!dissociate;
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        try {
            if (
                request &&
                response &&
                request.accountId === response.accountId &&
                request.relayerAccount === response.relayerAccount
            ) {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}
