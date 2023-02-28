import { Token } from '@entity/token';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
// import { HederaSDKHelper } from '@hedera-modules';
import { ApiResponse } from '@api/api-response';
import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper,
    RunFunctionAsync
} from '@guardian/common';
import { MessageAPI, IToken, WorkerTaskType, GenerateUUIDv4 } from '@guardian/interfaces';
import { emptyNotifier, initNotifier, INotifier } from '@helpers/notifier';
import { Workers } from '@helpers/workers';

/**
 * Get token info
 * @param info
 * @param token
 */
function getTokenInfo(info: any, token: any, serials?: any[]) {
    const tokenId = token.tokenId;
    const result: any = {
        id: token.id,
        tokenId: token.tokenId,
        tokenName: token.tokenName,
        tokenSymbol: token.tokenSymbol,
        tokenType: token.tokenType,
        decimals: token.decimals,
        policyId: token.policyId,
        enableAdmin: !!token.enableAdmin,
        enableFreeze: !!token.enableFreeze,
        enableKYC: !!token.enableKYC,
        enableWipe: !!token.enableWipe,
        associated: false,
        balance: null,
        hBarBalance: null,
        frozen: null,
        kyc: null,
        serials
    }
    if (info && info[tokenId]) {
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
            result.balance = 'N/A';
        }
    }
    return result;
}

/**
 * Create token
 * @param token
 * @param owner
 * @param tokenRepository
 * @param notifier
 */
async function createToken(token: any, owner: any, tokenRepository: DataBaseHelper<Token>, notifier: INotifier): Promise<Token> {
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
        tokenType,
        draftToken
    } = token;

    if (!tokenName) {
        throw new Error('Invalid Token Name');
    }

    if (!tokenSymbol) {
        throw new Error('Invalid Token Symbol');
    }

    notifier.start('Resolve Hedera account');
    const users = new Users();
    const root = await users.getHederaAccount(owner);

    notifier.completedAndStart('Create token');

    let rawTokenObject: unknown = {
        tokenId: GenerateUUIDv4(),
        tokenName,
        tokenSymbol,
        tokenType,
        decimals,
        initialSupply,
        adminId: null,
        changeSupply,
        enableAdmin,
        enableFreeze,
        enableKYC,
        enableWipe,
        owner: root.did,
        policyId: null,
        draftToken
    };

    if (!draftToken) {
        const workers = new Workers();
        const tokenData = await workers.addNonRetryableTask({
            type: WorkerTaskType.CREATE_TOKEN,
            data: {
                operatorId: root.hederaAccountId,
                operatorKey: root.hederaAccountKey,
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
            }
        }, 1);

        rawTokenObject = {
            tokenId: tokenData.tokenId,
            tokenName: tokenData.tokenName,
            tokenSymbol: tokenData.tokenSymbol,
            tokenType: tokenData.tokenType,
            decimals: tokenData.decimals,
            initialSupply: tokenData.initialSupply,
            adminId: tokenData.treasuryId,
            changeSupply: !!tokenData.supplyKey,
            enableAdmin: !!tokenData.adminKey,
            enableKYC: !!tokenData.kycKey,
            enableFreeze: !!tokenData.freezeKey,
            enableWipe: !!tokenData.wipeKey,
            owner: root.did,
            policyId: null,
            draftToken: false
        };

        const wallet = new Wallet();
        await Promise.all([
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_TREASURY_KEY,
                tokenData.tokenId,
                tokenData.treasuryKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_ADMIN_KEY,
                tokenData.tokenId,
                tokenData.adminKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_FREEZE_KEY,
                tokenData.tokenId,
                tokenData.freezeKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_KYC_KEY,
                tokenData.tokenId,
                tokenData.kycKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_SUPPLY_KEY,
                tokenData.tokenId,
                tokenData.supplyKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_WIPE_KEY,
                tokenData.tokenId,
                tokenData.wipeKey
            )
        ]);
    }

    notifier.completedAndStart('Create and save token in DB');
    const tokenObject = tokenRepository.create(rawTokenObject);
    const result = await tokenRepository.save(tokenObject);

    notifier.completed();
    return result;
}

/**
 * Update token
 * @param oldToken
 * @param newToken
 * @param tokenRepository
 * @param notifier
 */
async function updateToken(oldToken: Token, newToken: Token, tokenRepository: DataBaseHelper<Token>, notifier: INotifier): Promise<Token> {
    if (oldToken.draftToken && newToken.draftToken) {
        notifier.start('Update token');
        const tokenObject = Object.assign(oldToken, newToken);
        const result = await tokenRepository.update(tokenObject);
        notifier.completed();

        return result;
    } else if (oldToken.draftToken && !newToken.draftToken) {
        notifier.start('Resolve Hedera account');
        const users = new Users();
        const wallet = new Wallet();
        const workers = new Workers();

        const root = await users.getHederaAccount(oldToken.owner);

        const tokenData = await workers.addNonRetryableTask({
            type: WorkerTaskType.CREATE_TOKEN,
            data: {
                operatorId: root.hederaAccountId,
                operatorKey: root.hederaAccountKey,
                changeSupply: newToken.changeSupply,
                decimals: newToken.decimals,
                enableAdmin: newToken.enableAdmin,
                enableFreeze: newToken.enableFreeze,
                enableKYC: newToken.enableKYC,
                enableWipe: newToken.enableWipe,
                initialSupply: newToken.initialSupply,
                tokenName: newToken.tokenName,
                tokenSymbol: newToken.tokenSymbol,
                tokenType: newToken.tokenType
            }
        }, 1);
        notifier.completedAndStart('Create and save token in DB');

        const tokenObject = Object.assign(oldToken, {
            tokenId: tokenData.tokenId,
            tokenName: tokenData.tokenName,
            tokenSymbol: tokenData.tokenSymbol,
            tokenType: tokenData.tokenType,
            decimals: tokenData.decimals,
            initialSupply: tokenData.initialSupply,
            adminId: tokenData.treasuryId,
            changeSupply: !!tokenData.supplyKey,
            enableAdmin: !!tokenData.adminKey,
            enableKYC: !!tokenData.kycKey,
            enableFreeze: !!tokenData.freezeKey,
            enableWipe: !!tokenData.wipeKey,
            owner: root.did,
            policyId: null,
            draftToken: false
        })

        const result = await tokenRepository.update(tokenObject);

        await Promise.all([
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_TREASURY_KEY,
                tokenData.tokenId,
                tokenData.treasuryKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_ADMIN_KEY,
                tokenData.tokenId,
                tokenData.adminKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_FREEZE_KEY,
                tokenData.tokenId,
                tokenData.freezeKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_KYC_KEY,
                tokenData.tokenId,
                tokenData.kycKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_SUPPLY_KEY,
                tokenData.tokenId,
                tokenData.supplyKey
            ),
            wallet.setUserKey(
                root.did,
                KeyType.TOKEN_WIPE_KEY,
                tokenData.tokenId,
                tokenData.wipeKey
            )
        ]);

        notifier.completed();

        return result;

    } else {

        if (!newToken.tokenName) {
            throw new Error('Invalid Token Name');
        }

        if (!newToken.tokenSymbol) {
            throw new Error('Invalid Token Symbol');
        }

        if (!oldToken.enableAdmin) {
            throw new Error('Invalid Admin Key');
        }

        const changes: { [x: string]: any } = {};
        if (oldToken.tokenName !== newToken.tokenName) {
            changes.tokenName = newToken.tokenName;
        }
        if (oldToken.tokenSymbol !== newToken.tokenSymbol) {
            changes.tokenSymbol = newToken.tokenSymbol;
        }

        notifier.start('Resolve Hedera account');
        const users = new Users();
        const wallet = new Wallet();
        const workers = new Workers();

        const root = await users.getHederaAccount(oldToken.owner);

        const adminKey = await wallet.getUserKey(
            oldToken.owner,
            KeyType.TOKEN_ADMIN_KEY,
            oldToken.tokenId
        );

        notifier.completedAndStart('Update token');

        const tokenData = await workers.addNonRetryableTask({
            type: WorkerTaskType.UPDATE_TOKEN,
            data: {
                tokenId: oldToken.tokenId,
                operatorId: root.hederaAccountId,
                operatorKey: root.hederaAccountKey,
                adminKey,
                changes
            }
        }, 1);

        notifier.completedAndStart('Save token in DB');

        oldToken.tokenName = newToken.tokenName;
        oldToken.tokenSymbol = newToken.tokenSymbol;

        const result = await tokenRepository.update(oldToken);

        const saveKeys = [];
        if (changes.enableFreeze) {
            saveKeys.push(wallet.setUserKey(
                root.did,
                KeyType.TOKEN_FREEZE_KEY,
                tokenData.tokenId,
                tokenData.freezeKey
            ));
        }
        if (changes.enableKYC) {
            saveKeys.push(wallet.setUserKey(
                root.did,
                KeyType.TOKEN_KYC_KEY,
                tokenData.tokenId,
                tokenData.kycKey
            ));
        }
        if (changes.enableWipe) {
            saveKeys.push(wallet.setUserKey(
                root.did,
                KeyType.TOKEN_WIPE_KEY,
                tokenData.tokenId,
                tokenData.wipeKey
            ));
        }
        await Promise.all(saveKeys);

        notifier.completed();
        return result;
    }
}

/**
 * Delete token
 * @param token
 * @param tokenRepository
 * @param notifier
 */
async function deleteToken(token: Token, tokenRepository: DataBaseHelper<Token>, notifier: INotifier): Promise<boolean> {
    if (!token.draftToken) {
        notifier.start('Resolve Hedera account');
        const users = new Users();
        const wallet = new Wallet();
        const workers = new Workers();

        const root = await users.getHederaAccount(token.owner);
        const adminKey = await wallet.getUserKey(
            token.owner,
            KeyType.TOKEN_ADMIN_KEY,
            token.tokenId
        );

        notifier.completedAndStart('Delete token');

        const tokenData = await workers.addNonRetryableTask({
            type: WorkerTaskType.DELETE_TOKEN,
            data: {
                tokenId: token.tokenId,
                operatorId: root.hederaAccountId,
                operatorKey: root.hederaAccountKey,
                adminKey
            }
        }, 1);
        notifier.completedAndStart('Save token in DB');

        if (tokenData) {
            await tokenRepository.delete(token);
        }
    } else {
        notifier.start('Delete token from db');
        await tokenRepository.delete(token);
    }

    notifier.completed();

    return true;
}

/**
 * Associate/dissociate token
 * @param tokenId
 * @param did
 * @param associate
 * @param tokenRepository
 * @param notifier
 */
async function associateToken(tokenId: any, did: any, associate: any, tokenRepository: DataBaseHelper<Token>, notifier: INotifier): Promise<boolean> {
    notifier.start('Find token data');
    const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
    if (!token) {
        throw new Error('Token not found');
    }

    const wallet = new Wallet();
    const users = new Users();
    notifier.completedAndStart('Resolve Hedera account');
    const user = await users.getUserById(did);
    const userID = user.hederaAccountId;
    const userDID = user.did;
    const userKey = await wallet.getKey(user.walletToken, KeyType.KEY, userDID);
    if (!user) {
        throw new Error('User not found');
    }

    if (!user.hederaAccountId) {
        throw new Error('User is not linked to an Hedera Account');
    }

    notifier.completedAndStart(associate ? 'Associate' : 'Dissociate');

    const workers = new Workers();
    const status = await workers.addNonRetryableTask({
        type: WorkerTaskType.ASSOCIATE_TOKEN,
        data: {
            tokenId,
            userID,
            userKey,
            associate
        }
    }, 1);

    notifier.completed();
    return status;
}

/**
 * Grant/revoke KYC
 * @param tokenId
 * @param username
 * @param owner
 * @param grant
 * @param tokenRepository
 * @param notifier
 */
async function grantKycToken(
    tokenId: any,
    username: string,
    owner: string,
    grant: boolean,
    tokenRepository: DataBaseHelper<Token>,
    notifier: INotifier
): Promise<any> {
    notifier.start('Find token data');
    const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
    if (!token) {
        throw new Error('Token not found');
    }

    notifier.completedAndStart('Resolve Hedera account');
    const users = new Users();
    const user = await users.getUser(username);
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.hederaAccountId) {
        throw new Error('User is not linked to an Hedera Account');
    }

    const root = await users.getHederaAccount(owner);

    notifier.completedAndStart(grant ? 'Grant KYC' : 'Revoke KYC');
    const workers = new Workers();
    const kycKey = await new Wallet().getUserKey(
        token.owner,
        KeyType.TOKEN_KYC_KEY,
        token.tokenId
    );
    await workers.addNonRetryableTask({
        type: WorkerTaskType.GRANT_KYC_TOKEN,
        data: {
            hederaAccountId: root.hederaAccountId,
            hederaAccountKey: root.hederaAccountKey,
            userHederaAccountId: user.hederaAccountId,
            tokenId,
            kycKey,
            grant
        }
    }, 10);

    const info = await workers.addNonRetryableTask({
        type: WorkerTaskType.GET_ACCOUNT_INFO,
        data: {
            userID: root.hederaAccountId,
            userKey: root.hederaAccountKey,
            hederaAccountId: user.hederaAccountId,
        }
    }, 10);

    const result = getTokenInfo(info, token);
    notifier.completed();
    return result;
}

/**
 * Freeze/unfreeze token
 * @param tokenId
 * @param username
 * @param owner
 * @param freeze
 * @param tokenRepository
 * @param notifier
 */
async function freezeToken(
    tokenId: any,
    username: string,
    owner: string,
    freeze: boolean,
    tokenRepository: DataBaseHelper<Token>,
    notifier: INotifier
): Promise<any> {
    notifier.start('Find token data');
    const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
    if (!token) {
        throw new Error('Token not found');
    }

    notifier.completedAndStart('Resolve Hedera account');
    const users = new Users();
    const user = await users.getUser(username);
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.hederaAccountId) {
        throw new Error('User is not linked to an Hedera Account');
    }

    const root = await users.getHederaAccount(owner);

    notifier.completedAndStart(freeze ? 'Freeze Token' : 'Unfreeze Token');
    const workers = new Workers();
    const freezeKey = await new Wallet().getUserKey(
        token.owner,
        KeyType.TOKEN_FREEZE_KEY,
        token.tokenId
    );
    await workers.addNonRetryableTask({
        type: WorkerTaskType.FREEZE_TOKEN,
        data: {
            hederaAccountId: root.hederaAccountId,
            hederaAccountKey: root.hederaAccountKey,
            userHederaAccountId: user.hederaAccountId,
            freezeKey,
            tokenId,
            freeze
        }
    }, 1);

    const info = await workers.addNonRetryableTask({
        type: WorkerTaskType.GET_ACCOUNT_INFO,
        data: {
            userID: root.hederaAccountId,
            userKey: root.hederaAccountKey,
            hederaAccountId: user.hederaAccountId,
        }
    }, 10);

    const result = getTokenInfo(info, token);
    notifier.completed();
    return result;
}

/**
 * Connect to the message broker methods of working with tokens.
 *
 * @param channel - channel
 * @param tokenRepository - table with tokens
 */
export async function tokenAPI(
    channel: MessageBrokerChannel,
    apiGatewayChannel: MessageBrokerChannel,
    tokenRepository: DataBaseHelper<Token>
): Promise<void> {
    /**
     * Create new token
     *
     * @param {IToken} payload - token
     *
     * @returns {IToken[]} - all tokens
     */
    ApiResponse(channel, MessageAPI.SET_TOKEN, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }

            const { token, owner } = msg;

            await createToken(token, owner, tokenRepository, emptyNotifier());

            const tokens = await tokenRepository.findAll();
            return new MessageResponse(tokens);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.SET_TOKEN_ASYNC, async (msg) => {
        const { token, owner, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);

        RunFunctionAsync(async () => {
            if (!msg) {
                throw new Error('Invalid Params');
            }
            const result = await createToken(token, owner, tokenRepository, notifier);
            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(channel, MessageAPI.UPDATE_TOKEN_ASYNC, async (msg) => {
        const { token, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);
        RunFunctionAsync(async () => {
            if (!msg) {
                throw new Error('Invalid Params');
            }
            const item = await tokenRepository.findOne({ tokenId: token.tokenId });
            if (!item) {
                throw new Error('Token not found');
            }
            const result = await updateToken(item, token, tokenRepository, notifier);
            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(channel, MessageAPI.DELETE_TOKEN_ASYNC, async (msg) => {
        const { tokenId, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);
        RunFunctionAsync(async () => {
            if (!msg) {
                throw new Error('Invalid Params');
            }
            const item = await tokenRepository.findOne({ tokenId });
            if (!item) {
                throw new Error('Token not found');
            }
            const result = await deleteToken(item, tokenRepository, notifier);
            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });
        return new MessageResponse({ taskId });
    });

    ApiResponse(channel, MessageAPI.FREEZE_TOKEN, async (msg) => {
        try {
            const { tokenId, username, owner, freeze } = msg;
            const result = await freezeToken(tokenId, username, owner, freeze, tokenRepository, emptyNotifier());
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error, 400);
        }
    });

    ApiResponse(channel, MessageAPI.FREEZE_TOKEN_ASYNC, async (msg) => {
        const { tokenId, username, owner, freeze, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);

        RunFunctionAsync(async () => {
            const result = await freezeToken(tokenId, username, owner, freeze, tokenRepository, notifier);
            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(channel, MessageAPI.KYC_TOKEN, async (msg) => {
        try {
            const { tokenId, username, owner, grant } = msg;
            const result = await grantKycToken(tokenId, username, owner, grant, tokenRepository, emptyNotifier());
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error, 400);
        }
    });

    ApiResponse(channel, MessageAPI.KYC_TOKEN_ASYNC, async (msg) => {
        const { tokenId, username, owner, grant, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);

        RunFunctionAsync(async () => {
            const result = await grantKycToken(tokenId, username, owner, grant, tokenRepository, notifier);
            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    });

    ApiResponse(channel, MessageAPI.ASSOCIATE_TOKEN, async (msg) => {
        try {
            const { tokenId, did, associate } = msg;
            const status = await associateToken(tokenId, did, associate, tokenRepository, emptyNotifier());
            return new MessageResponse(status);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error, 400);
        }
    })

    ApiResponse(channel, MessageAPI.ASSOCIATE_TOKEN_ASYNC, async (msg) => {
        const { tokenId, did, associate, taskId } = msg;
        const notifier = initNotifier(apiGatewayChannel, taskId);

        RunFunctionAsync(async () => {
            const status = await associateToken(tokenId, did, associate, tokenRepository, notifier);
            notifier.result(status);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse({ taskId });
    })

    ApiResponse(channel, MessageAPI.GET_INFO_TOKEN, async (msg) => {
        try {
            const { tokenId, username, owner } = msg;

            const users = new Users();
            const user = await users.getUser(username);
            if (!user) {
                throw new Error('User not found');
            }

            const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
            if (!token) {
                throw new Error('Token not found');
            }

            if (!user.hederaAccountId) {
                return new MessageResponse(getTokenInfo(null, token));
            }

            const root = await users.getHederaAccount(owner);
            const workers = new Workers();
            const info = await workers.addNonRetryableTask({
                type: WorkerTaskType.GET_ACCOUNT_INFO,
                data: {
                    userID: root.hederaAccountId,
                    userKey: root.hederaAccountKey,
                    hederaAccountId: user.hederaAccountId
                }
            }, 1);

            const result = getTokenInfo(info, token);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error, 400);
        }
    })

    ApiResponse(channel, MessageAPI.GET_ASSOCIATED_TOKENS, async (msg) => {
        try {
            const wallet = new Wallet();
            const users = new Users();
            const { did } = msg;
            const user = await users.getUserById(did);
            const userID = user.hederaAccountId;
            const userDID = user.did;
            const userKey = await wallet.getKey(user.walletToken, KeyType.KEY, userDID);

            if (!user) {
                throw new Error('User not found');
            }

            if (!user.hederaAccountId) {
                return new MessageResponse([]);

            }

            const workers = new Workers();
            const info = await workers.addNonRetryableTask({
                type: WorkerTaskType.GET_ACCOUNT_INFO,
                data: {
                    userID,
                    userKey,
                    hederaAccountId: user.hederaAccountId
                }
            }, 1);

            const tokens: any = await tokenRepository.find(user.parent
                ? {
                    where: {
                        $or: [
                            { owner: { $eq: user.parent } },
                            { owner: { $exists: false } }
                        ]
                    }
                }
                : {}
            );

            const serials =
                (await workers.addNonRetryableTask(
                    {
                        type: WorkerTaskType.GET_USER_NFTS_SERIALS,
                        data: {
                            operatorId: userID,
                            operatorKey: userKey,
                        },
                    },
                    1
                )) || {};

            const result: any[] = [];
            for (const token of tokens) {
                result.push(getTokenInfo(info, token, serials[token.tokenId]));
            }
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error, 400);
        }
    })

    /**
     * Return tokens
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.tokenId] - token id
     * @param {string} [payload.did] - user did
     *
     * @returns {IToken[]} - tokens
     */
    ApiResponse(channel, MessageAPI.GET_TOKENS, async (msg) => {
        if (msg) {
            if (msg.tokenId) {
                const reqObj: any = { where: {} as unknown };
                reqObj.where.tokenId = { $eq: msg.tokenId }
                const tokens = await tokenRepository.find(reqObj);
                return new MessageResponse(tokens);
            }
            if (msg.ids) {
                const reqObj: any = { where: {} as unknown };
                reqObj.where.tokenId = { $in: msg.ids }
                const tokens = await tokenRepository.find(reqObj);
                return new MessageResponse(tokens);

            }
        }
        return new MessageResponse(await tokenRepository.find({
            where: {
                $or: [
                    { owner: { $eq: msg.did } },
                    { owner: { $exists: false } }
                ]
            }
        }));
    })

    /**
     * Return token
     *
     * @param {Object} [payload] - filters
     *
     * @returns {IToken} - token
     */
    ApiResponse(channel, MessageAPI.GET_TOKEN, async (msg) => {
        if (msg) {
            const token = await tokenRepository.findOne(msg);
            return new MessageResponse(token);
        }
        return new MessageResponse(null);
    })

    /**
     * Import tokens
     *
     * @param {IToken[]} payload - tokens
     *
     * @returns {IToken[]} - all tokens
     */
    ApiResponse(channel, MessageAPI.IMPORT_TOKENS, async (msg) => {
        try {
            let items: IToken[] = msg;
            if (!Array.isArray(items)) {
                items = [items];
            }
            const existingTokens = await tokenRepository.findAll();
            const existingTokensMap = {};
            for (const existingToken of existingTokens) {
                existingTokensMap[existingToken.tokenId] = true;
            }
            items = items.filter((token: any) => !existingTokensMap[token.tokenId]);
            const tokenObject = tokenRepository.create(items);
            await tokenRepository.save(tokenObject);
            const tokens = await tokenRepository.findAll();
            return new MessageResponse(tokens);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    })
}
