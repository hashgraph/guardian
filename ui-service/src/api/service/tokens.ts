import {Guardians} from '@helpers/guardians';
import {Users} from '@helpers/users';
import {KeyType, Wallet} from '@helpers/wallet';
import {Request, Response, Router} from 'express';
import {ITokenInfo, UserRole} from 'interfaces';
import {HederaHelper} from 'vc-modules';

const getTokenInfo = (info: any, token: any, tokenId: string) => {
    if (info[tokenId]) {
        token.associated = true;
        token.balance = info[tokenId].balance;
        token.hBarBalance = info[tokenId].hBarBalance;
        token.frozen = !!info[tokenId].frozen;
        token.kyc = !!info[tokenId].kyc;
        try {
            if (token.decimals) {
                token.balance = (
                    token.balance / Math.pow(10, token.decimals)
                ).toFixed(token.decimals)
            }
        } catch (error) {
            token.balance = "N/A";
        }
    } else {
        token.associated = false;
        token.balance = null;
        token.hBarBalance = null;
        token.frozen = null;
        token.kyc = null;
    }
}

/**
 * Token route
 */
export const tokenAPI = Router();

tokenAPI.post('/create', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }

    const root = await guardians.getRootConfig(user.did);

    const {
        changeSupply,
        decimals,
        enableAdmin,
        enableFreeze,
        enableKYC,
        enableWipe,
        initialSupply,
        policies,
        tokenName,
        tokenSymbol,
        tokenType
    } = req.body;

    let treasury: any, tokenId: string, newToken: any;
    try {
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
            policies,
            adminId: treasuryId ? treasuryId.toString() : null,
            adminKey: adminKey ? adminKey.toString() : null,
            kycKey: kycKey ? kycKey.toString() : null,
            freezeKey: freezeKey ? freezeKey.toString() : null,
            wipeKey: wipeKey ? wipeKey.toString() : null,
            supplyKey: supplyKey ? supplyKey.toString() : null,
        }

    } catch (error) {
        console.error("Failed to create token", error)
        res.status(500).send({code: 500, message: error.message});
        return;
    }

    const tokens = (await guardians.setToken(newToken));

    res.status(200).json(tokens);
});

tokenAPI.get('/', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    if (!(await users.permission(req, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }
    const tokens = (await guardians.getTokens(null));
    res.json(tokens);
});

tokenAPI.get('/user-tokens', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();
    const wallet = new Wallet();

    const user = await users.currentUser(req);

    if (!(await users.permission(user, [UserRole.INSTALLER, UserRole.ORIGINATOR]))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }

    if (!user.hederaAccountId) {
        res.status(200).json([]);
        return;
    }

    const installerID = user.hederaAccountId;
    const installerDID = user.did;
    const installerKey = await wallet.getKey(user.walletToken, KeyType.KEY, installerDID);

    const tokens = (await guardians.getTokens(null)) || [];
    const result = tokens.map(e => {
        return {
            id: e.id,
            tokenId: e.tokenId,
            tokenName: e.tokenName,
            tokenSymbol: e.tokenSymbol,
            tokenType: e.tokenType,
            decimals: e.decimals,
        }
    });
    try {
        const info = await HederaHelper
            .setOperator(installerID, installerKey).SDK
            .accountInfo(user.hederaAccountId);
        for (let i = 0; i < result.length; i++) {
            const element = result[i];
            getTokenInfo(info, element, element.tokenId);
        }
    } catch (error) {
        res.status(500).send({code: 500, message: error});
        return;
    }

    res.json(result as ITokenInfo[]);
});

tokenAPI.post('/associate', async (req: Request, res: Response) => {
    const users = new Users();
    const wallet = new Wallet();

    if (!(await users.permission(req, [UserRole.INSTALLER, UserRole.ORIGINATOR]))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }

    const {tokenId, associated} = req.body;

    const user = await users.currentUser(req);
    const installerDID = user.did;
    const installerID = user.hederaAccountId;
    const installerKey = await wallet.getKey(user.walletToken, KeyType.KEY, installerDID);

    let result = null;
    try {
        if (associated) {
            const status = await HederaHelper.setOperator(installerID, installerKey).SDK.associate(tokenId, installerID, installerKey);
            result = status;
        } else {
            const status = await HederaHelper.setOperator(installerID, installerKey).SDK.dissociate(tokenId, installerID, installerKey);
            result = !status;
        }
    } catch (error) {
        res.status(500).json({code: 403, message: error});
        return;
    }
    res.status(200).json(result);
});


tokenAPI.get('/all-users', async (req: Request, res: Response) => {
    const users = new Users();

    if (!(await users.permission(req, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }

    const installers = await users.getUsersByRole(UserRole.INSTALLER);
    const map = installers.map((e) => ({
        username: e.username,
        did: e.did
    }))

    res.status(200).json(map);
});


tokenAPI.get('/associate-users', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const rootUser = await users.currentUser(req);
    if (!(await users.permission(rootUser, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }
    const root = await guardians.getRootConfig(rootUser.did);

    const tokenId = req.query.tokenId as string;
    const username = req.query.username as string;

    const user = await users.getUser(username);
    if (!user.hederaAccountId) {
        res.status(200).json(null);
        return
    }
    try {
        const result: any = {};
        const info = await HederaHelper
            .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
            .accountInfo(user.hederaAccountId);
        getTokenInfo(info, result, tokenId);
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        console.log(error);
        res.status(500).json({code: 403, message: error});
    }
});

tokenAPI.post('/user-kyc', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const rootUser = await users.currentUser(req);
    if (!(await users.permission(rootUser, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }
    const root = await guardians.getRootConfig(rootUser.did);

    const {tokenId, username, value} = req.body;
    const token = (await guardians.getTokens({tokenId}))[0];
    const kycKey = token.kycKey;

    const user = await users.getUser(username);
    try {
        const hederaHelper = HederaHelper.setOperator(root.hederaAccountId, root.hederaAccountKey);
        const result: any = {};
        if (value) {
            await hederaHelper.SDK.grantKyc(tokenId, user.hederaAccountId, kycKey);
        } else {
            await hederaHelper.SDK.revokeKyc(tokenId, user.hederaAccountId, kycKey);
        }
        const info = await hederaHelper.SDK.accountInfo(user.hederaAccountId);
        getTokenInfo(info, result, tokenId);
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        console.log(error)
        res.status(500).send(error);
    }
});

tokenAPI.post('/user-freeze', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const rootUser = await users.currentUser(req);
    if (!(await users.permission(rootUser, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }
    const root = await guardians.getRootConfig(rootUser.did);

    const {tokenId, username, value} = req.body;
    const token = (await guardians.getTokens({tokenId}))[0];
    const freezeKey = token.freezeKey;

    const user = await users.getUser(username);
    try {
        const hederaHelper = HederaHelper.setOperator(root.hederaAccountId, root.hederaAccountKey);
        const result: any = {};
        if (value) {
            await hederaHelper.SDK.freeze(tokenId, user.hederaAccountId, freezeKey);
        } else {
            await hederaHelper.SDK.unfreeze(tokenId, user.hederaAccountId, freezeKey);
        }
        const info = await hederaHelper.SDK.accountInfo(user.hederaAccountId);
        getTokenInfo(info, result, tokenId);
        res.status(200).json(result as ITokenInfo);
    } catch (error) {
        res.status(500).send({code: 500, message: error.message});
    }
});
