import { PolicyAction, Token } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class AssociateToken {
    public static async local(
        ref: AnyBlockType,
        token: Token,
        user: string,
        userId: string | null
    ): Promise<boolean> {
        const userCred = await PolicyUtils.getUserCredentials(ref, user, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        return await PolicyUtils.associate(ref, token, userHederaCred, userId);
    }

    public static async request(
        ref: AnyBlockType,
        token: Token,
        user: string,
        userId: string | null
    ): Promise<any> {
        const userAccount = await PolicyUtils.getHederaAccountId(ref, user, userId);
        const data = {
            uuid: GenerateUUIDv4(),
            owner: user,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.AssociateToken,
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

    public static async response(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const { token } = data;

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const associate = await PolicyUtils.associate(ref, token, userHederaCred, userId);

        return {
            type: PolicyActionType.AssociateToken,
            owner: user.did,
            token,
            associate
        };
    }

    public static async complete(
        row: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        const data = row.document;
        const { associate } = data;
        return !!associate;
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        try {
            if (request && response && request.accountId === response.accountId) {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}
