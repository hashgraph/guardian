import { Token } from '@entity/token';
import { IToken, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger } from 'logger-helper';
import { MongoRepository } from 'typeorm';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { HederaSDKHelper } from '@hedera-modules';
import { ApiResponse } from '@api/api-response';
import { Policy } from '@entity/policy';
import { findAllEntities } from '@helpers/utils';

function getTokenInfo(info: any, token: any) {
    const tokenId = token.tokenId;
    const result = {
        id: token.id,
        tokenId: token.tokenId,
        tokenName: token.tokenName,
        tokenSymbol: token.tokenSymbol,
        tokenType: token.tokenType,
        decimals: token.decimals,
        policies: token.policies,
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
 * Connect to the message broker methods of working with tokens.
 * 
 * @param channel - channel
 * @param tokenRepository - table with tokens
 */
export const tokenAPI = async function (
    channel: any,
    tokenRepository: MongoRepository<Token>,
    policyRepository: MongoRepository<Policy>
): Promise<void> {
    /**
     * Create new token
     * 
     * @param {IToken} payload - token
     * 
     * @returns {IToken[]} - all tokens
     */
    ApiResponse(channel, MessageAPI.SET_TOKEN, async (msg, res) => {
        try {
            if (!msg.payload) {
                throw 'Invalid Params';
            }

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
            } = msg.payload.token;
            const owner = msg.payload.owner;

            if (!tokenName) {
                throw 'Invalid Token Name';
            }

            if (!tokenSymbol) {
                throw 'Invalid Token Symbol';
            }

            const users = new Users();
            const root = await users.getHederaAccount(owner);

            const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
            const treasury = await client.newAccount(2);
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
            const tokenId = await client.newToken(
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
            const tokenObject = tokenRepository.create({
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
            });
            const result = await tokenRepository.save(tokenObject);
            const tokens = await tokenRepository.find();
            res.send(new MessageResponse(tokens));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
        }
    })

    ApiResponse(channel, MessageAPI.FREEZE_TOKEN, async (msg, res) => {
        try {
            const { tokenId, username, owner, freeze } = msg.payload;

            const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
            if (!token) {
                throw 'Token not found';
            }

            const users = new Users();
            const user = await users.getUser(username);
            if (!user) {
                throw 'User not found';
            }
            if (!user.hederaAccountId) {
                throw 'User is not linked to an Hedera Account';
            }

            const root = await users.getHederaAccount(owner);
            const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
            const freezeKey = token.freezeKey;
            if (freeze) {
                await client.freeze(tokenId, user.hederaAccountId, freezeKey);
            } else {
                await client.unfreeze(tokenId, user.hederaAccountId, freezeKey);
            }

            const info = await client.accountInfo(user.hederaAccountId);
            const result = getTokenInfo(info, { tokenId });
            res.send(new MessageResponse(result));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 400));
        }
    })


    ApiResponse(channel, MessageAPI.KYC_TOKEN, async (msg, res) => {
        try {
            const { tokenId, username, owner, grant } = msg.payload;

            const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
            if (!token) {
                throw 'Token not found';
            }

            const users = new Users();
            const user = await users.getUser(username);
            if (!user) {
                throw 'User not found';
            }
            if (!user.hederaAccountId) {
                throw 'User is not linked to an Hedera Account';
            }

            const root = await users.getHederaAccount(owner);
            const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
            const kycKey = token.kycKey;
            if (grant) {
                await client.grantKyc(tokenId, user.hederaAccountId, kycKey);
            } else {
                await client.revokeKyc(tokenId, user.hederaAccountId, kycKey);
            }

            const info = await client.accountInfo(user.hederaAccountId);
            const result = getTokenInfo(info, { tokenId });
            res.send(new MessageResponse(result));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 400));
        }
    })

    ApiResponse(channel, MessageAPI.ASSOCIATE_TOKEN, async (msg, res) => {
        try {
            const { tokenId, did, associate } = msg.payload;

            const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
            if (!token) {
                throw 'Token not found';
            }

            const wallet = new Wallet();
            const users = new Users();
            const user = await users.getUserById(did);
            const userID = user.hederaAccountId;
            const userDID = user.did;
            const userKey = await wallet.getKey(user.walletToken, KeyType.KEY, userDID);
            if (!user) {
                throw 'User not found';
            }

            if (!user.hederaAccountId) {
                throw 'User is not linked to an Hedera Account';
            }

            const client = new HederaSDKHelper(userID, userKey);
            let status: boolean;
            if (associate) {
                status = await client.associate(tokenId, userID, userKey);
            } else {
                status = await client.dissociate(tokenId, userID, userKey);
            }

            res.send(new MessageResponse(status));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 400));
        }
    })

    ApiResponse(channel, MessageAPI.GET_INFO_TOKEN, async (msg, res) => {
        try {
            const { tokenId, username, owner } = msg.payload;

            const users = new Users();
            const user = await users.getUser(username);
            if (!user) {
                throw 'User not found';
            }
            if (!user.hederaAccountId) {
                throw 'User is not linked to an Hedera Account';
            }

            const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
            if (!token) {
                throw 'Token not found';
            }

            const root = await users.getHederaAccount(owner);
            const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
            const info = await client.accountInfo(user.hederaAccountId);
            const result = getTokenInfo(info, { tokenId });

            res.send(new MessageResponse(result));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 400));
        }
    })

    ApiResponse(channel, MessageAPI.GET_ASSOCIATED_TOKENS, async (msg, res) => {
        try {
            const wallet = new Wallet();
            const users = new Users();

            const { did } = msg.payload;
            const user = await users.getUserById(did);
            const userID = user.hederaAccountId;
            const userDID = user.did;
            const userKey = await wallet.getKey(user.walletToken, KeyType.KEY, userDID);

            if (!user) {
                throw 'User not found';
            }

            if (!user.hederaAccountId) {
                res.send(new MessageResponse([]));
                return;
            }

            const client = new HederaSDKHelper(userID, userKey);
            const info = await client.accountInfo(user.hederaAccountId);

            const tokens: any = await tokenRepository.find();

            const policies = await policyRepository.find();
            const tokenPolicies = [];
            for (let i = 0; i < tokens.length; i++) {
                const tokenPolicies = [];
                const token = tokens[i];
                for (let j = 0; j < policies.length; j++) {
                    const policyObject = policies[j];
                    const tokenIds = findAllEntities(policyObject.config, ['tokenId']);
                    if (tokenIds.includes(token.tokenId)) {
                        tokenPolicies.push(`${policyObject.name} (${policyObject.version})`);
                        continue;
                    }
                }
                token.policies = tokenPolicies;
            }

            const result: any[] = [];
            for (let i = 0; i < tokens.length; i++) {
                result.push(getTokenInfo(info, tokens[i]));
            }
            res.send(new MessageResponse(result));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message, 400));
        }
    })

    /**
     * Return tokens
     * 
     * @param {Object} [payload] - filters
     * @param {string} [payload.tokenId] - token id 
     * 
     * @returns {IToken[]} - tokens
     */
    ApiResponse(channel, MessageAPI.GET_TOKENS, async (msg, res) => {
        if (msg.payload) {
            if (msg.payload.tokenId) {
                const reqObj: any = { where: {} };
                reqObj.where['tokenId'] = { $eq: msg.payload.tokenId }
                const tokens: IToken[] = await tokenRepository.find(reqObj);
                res.send(new MessageResponse(tokens));
                return;
            }
            if (msg.payload.ids) {
                const reqObj: any = { where: {} };
                reqObj.where['tokenId'] = { $in: msg.payload.ids }
                const tokens: IToken[] = await tokenRepository.find(reqObj);
                res.send(new MessageResponse(tokens));
                return;
            }
        }
        const tokens: any[] = await tokenRepository.find();
        const policies = await policyRepository.find();
        const tokenPolicies = [];
        for (let i = 0; i < tokens.length; i++) {
            const tokenPolicies = [];
            const token = tokens[i];
            for (let j = 0; j < policies.length; j++) {
                const policyObject = policies[j];
                const tokenIds = findAllEntities(policyObject.config, ['tokenId']);
                if (tokenIds.includes(token.tokenId)) {
                    tokenPolicies.push(`${policyObject.name} (${policyObject.version})`);
                    continue;
                }
            }
            token.policies = tokenPolicies;
        }
        res.send(new MessageResponse(tokens));
    })

    /**
     * Import tokens
     * 
     * @param {IToken[]} payload - tokens
     * 
     * @returns {IToken[]} - all tokens
     */
    ApiResponse(channel, MessageAPI.IMPORT_TOKENS, async (msg, res) => {
        try {
            let items: IToken[] = msg.payload;
            if (!Array.isArray(items)) {
                items = [items];
            }
            const existingTokens = await tokenRepository.find();
            const existingTokensMap = {};
            for (let i = 0; i < existingTokens.length; i++) {
                existingTokensMap[existingTokens[i].tokenId] = true;
            }
            items = items.filter((token: any) => !existingTokensMap[token.tokenId]);
            const tokenObject = tokenRepository.create(items);
            const result = await tokenRepository.save(tokenObject);
            const tokens = await tokenRepository.find();
            res.send(new MessageResponse(tokens));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
        }
    })
}
