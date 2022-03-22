import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';
import { Request, Response, Router } from 'express';
import { ITokenInfo, UserRole } from 'interfaces';
import { HederaHelper } from 'vc-modules';
import { Logger } from 'logger-helper';

function getTokenInfo(info: any, token: any) {
    const tokenId = token.tokenId;
    const result = {
        id: token.id,
        tokenId: token.tokenId,
        tokenName: token.tokenName,
        tokenSymbol: token.tokenSymbol,
        tokenType: token.tokenType,
        decimals: token.decimals,
        associated: false,
        balance: null,
        hBarBalance: null,
        frozen: null,
        kyc: null
    }
    if (info[tokenId]) {
        result.associated = true;
        result.balance = info[tokenId].balance;
        result.hBarBalance = info[tokenId].hBarBalance;
        result.frozen = !!info[tokenId].frozen;
        result.kyc = !!info[tokenId].kyc;
        try {
            if (result.decimals) {
                result.balance = (
                    result.balance / Math.pow(10, result.decimals)
                ).toFixed(result.decimals)
            }
        } catch (error) {
            result.balance = "N/A";
        }
    }
    return result;
}

/**
 * Token route
 */
export const tokenAPI = Router();

tokenAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const user = req.user;
        const root = await guardians.getRootConfig(user.did);

        const {
            changeSupply,
            decimals,
            enableAdmin,
            enableFreeze,
            enableKYC,
            enableWipe,
            initialSupply,
            tokenName,
            tokenSymbol,
            tokenType
        } = req.body;

        if (!tokenName) {
            res.status(400).send({ code: 400, message: 'Invalid Token Name' });
        }

        if (!tokenSymbol) {
            res.status(400).send({ code: 400, message: 'Invalid Token Symbol' });
        }

        let treasury: any, tokenId: string, newToken: any;

        const hederaHelper = HederaHelper
            .setOperator(root.hederaAccountId, root.hederaAccountKey);

        treasury = await hederaHelper.SDK.newAccount(2);
        const treasuryId = treasury.id;
        const treasuryKey = treasury.key;
        const adminKey = enableAdmin ? treasuryKey : null;
        const kycKey = enableKYC ? treasuryKey : null;
        const freezeKey = enableFreeze ? treasuryKey : null;
        const wipeKey = enableWipe ? treasuryKey : null;
        const supplyKey = changeSupply ? treasuryKey : null;
        const nft = tokenType == 'non-fungible';
        const _decimals = nft ? 0 : decimals;
        const _initialSupply = nft ? 0 : initialSupply;

        tokenId = await hederaHelper.SDK.newToken(
            tokenName,
            tokenSymbol,
            nft,
            _decimals,
            _initialSupply,
            '',
            treasury,
            adminKey,
            kycKey,
            freezeKey,
            wipeKey,
            supplyKey,
        );
        newToken = {
            tokenId,
            tokenName,
            tokenSymbol,
            tokenType,
            decimals: _decimals,
            initialSupply: _initialSupply,
            adminId: treasuryId ? treasuryId.toString() : null,
            adminKey: adminKey ? adminKey.toString() : null,
            kycKey: kycKey ? kycKey.toString() : null,
            freezeKey: freezeKey ? freezeKey.toString() : null,
            wipeKey: wipeKey ? wipeKey.toString() : null,
            supplyKey: supplyKey ? supplyKey.toString() : null,
        }

        const tokens = (await guardians.setToken(newToken));

        res.status(201).json(tokens);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

tokenAPI.get('/', permissionHelper(UserRole.ROOT_AUTHORITY, UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const user = req.user;
        const tokens = (await guardians.getTokens()) as any[];

        if (user.role === UserRole.ROOT_AUTHORITY) {
            res.status(200).json(tokens || []);
            return;
        } else {
            if (!user.hederaAccountId) {
                res.status(200).json([]);
                return;
            }

            const wallet = new Wallet();
            const userID = user.hederaAccountId;
            const userDID = user.did;
            const userKey = await wallet.getKey(user.walletToken, KeyType.KEY, userDID);


            const info = await HederaHelper
                .setOperator(userID, userKey).SDK
                .accountInfo(user.hederaAccountId);
            for (let i = 0; i < tokens.length; i++) {
                tokens[i] = getTokenInfo(info, tokens[i]);
            }
            res.json(tokens as ITokenInfo[]);
        }
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/associate', permissionHelper(UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const wallet = new Wallet();

        const tokenId = req.params.tokenId;
        const user = req.user;
        const userDID = user.did;
        const userID = user.hederaAccountId;
        const userKey = await wallet.getKey(user.walletToken, KeyType.KEY, userDID);
        const status = await HederaHelper.setOperator(userID, userKey).SDK.associate(tokenId, userID, userKey);
        res.status(200).json(status);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/dissociate', permissionHelper(UserRole.USER), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const wallet = new Wallet();
        const tokenId = req.params.tokenId;
        const user = req.user;
        const userDID = user.did;
        const userID = user.hederaAccountId;
        const userKey = await wallet.getKey(user.walletToken, KeyType.KEY, userDID);
        const status = await HederaHelper.setOperator(userID, userKey).SDK.dissociate(tokenId, userID, userKey);
        res.status(200).json(status);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/grantKyc', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const users = new Users();

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const rootUser = req.user;

        const root = await guardians.getRootConfig(rootUser.did);

        const token = (await guardians.getTokens({ tokenId }))[0];
        if (!token) {
            res.status(400).json({ code: 400, message: 'Token not found' });
            return
        }
        const kycKey = token.kycKey;

        const user = await users.getUser(username);
        if (!user) {
            res.status(400).json({ code: 400, message: 'User not found' });
            return
        }
        if (!user.hederaAccountId) {
            res.status(400).json({ code: 400, message: 'User is not linked to an Hedera Account' });
            return
        }

        const hederaHelper = HederaHelper.setOperator(root.hederaAccountId, root.hederaAccountKey);
        await hederaHelper.SDK.grantKyc(tokenId, user.hederaAccountId, kycKey);
        const info = await hederaHelper.SDK.accountInfo(user.hederaAccountId);
        const result = getTokenInfo(info, { tokenId });
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/revokeKyc', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const users = new Users();

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const rootUser = req.user;

        const root = await guardians.getRootConfig(rootUser.did);

        const token = (await guardians.getTokens({ tokenId }))[0];
        if (!token) {
            res.status(400).json({ code: 400, message: 'Token not found' });
            return
        }
        const kycKey = token.kycKey;

        const user = await users.getUser(username);
        if (!user) {
            res.status(400).json({ code: 400, message: 'User not found' });
            return
        }
        if (!user.hederaAccountId) {
            res.status(400).json({ code: 400, message: 'User is not linked to an Hedera Account' });
            return
        }

        const hederaHelper = HederaHelper.setOperator(root.hederaAccountId, root.hederaAccountKey);
        await hederaHelper.SDK.revokeKyc(tokenId, user.hederaAccountId, kycKey);
        const info = await hederaHelper.SDK.accountInfo(user.hederaAccountId);
        const result = getTokenInfo(info, { tokenId });
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/freeze', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const users = new Users();

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const rootUser = req.user;

        const root = await guardians.getRootConfig(rootUser.did);

        const token = (await guardians.getTokens({ tokenId }))[0];
        if (!token) {
            res.status(400).json({ code: 400, message: 'Token not found' });
            return
        }
        const kycKey = token.kycKey;

        const user = await users.getUser(username);
        if (!user) {
            res.status(400).json({ code: 400, message: 'User not found' });
            return
        }
        if (!user.hederaAccountId) {
            res.status(400).json({ code: 400, message: 'User is not linked to an Hedera Account' });
            return
        }

        const hederaHelper = HederaHelper.setOperator(root.hederaAccountId, root.hederaAccountKey);
        await hederaHelper.SDK.freeze(tokenId, user.hederaAccountId, kycKey);
        const info = await hederaHelper.SDK.accountInfo(user.hederaAccountId);
        const result = getTokenInfo(info, { tokenId });
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tokenAPI.put('/:tokenId/:username/unfreeze', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const users = new Users();

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const rootUser = req.user;

        const root = await guardians.getRootConfig(rootUser.did);

        const token = (await guardians.getTokens({ tokenId }))[0];
        if (!token) {
            res.status(400).json({ code: 400, message: 'Token not found' });
            return
        }
        const kycKey = token.kycKey;

        const user = await users.getUser(username);
        if (!user) {
            res.status(400).json({ code: 400, message: 'User not found' });
            return
        }
        if (!user.hederaAccountId) {
            res.status(400).json({ code: 400, message: 'User is not linked to an Hedera Account' });
            return
        }

        const hederaHelper = HederaHelper.setOperator(root.hederaAccountId, root.hederaAccountKey);
        await hederaHelper.SDK.unfreeze(tokenId, user.hederaAccountId, kycKey);
        const info = await hederaHelper.SDK.accountInfo(user.hederaAccountId);
        const result = getTokenInfo(info, { tokenId });
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

tokenAPI.get('/:tokenId/:username/info', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const users = new Users();

        const tokenId = req.params.tokenId;
        const username = req.params.username;

        const user = await users.getUser(username);
        if (!user) {
            res.status(400).json({ code: 400, message: 'User not found' });
            return
        }
        if (!user.hederaAccountId) {
            res.status(200).json(null);
            return
        }

        const rootUser = req.user;
        const root = await guardians.getRootConfig(rootUser.did);

        const info = await HederaHelper
            .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
            .accountInfo(user.hederaAccountId);
        const result = getTokenInfo(info, { tokenId });
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});