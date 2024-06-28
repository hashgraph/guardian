import { ApiResponse } from '../api/helpers/api-response.js';
import { ArrayMessageResponse, DataBaseHelper, DatabaseServer, KeyType, Logger, MessageError, MessageResponse, RunFunctionAsync, Token, TopicHelper, Users, Wallet, Workers, } from '@guardian/common';
import { GenerateUUIDv4, IOwner, IRootConfig, MessageAPI, OrderDirection, TopicType, WorkerTaskType } from '@guardian/interfaces';
import { emptyNotifier, initNotifier, INotifier } from '../helpers/notifier.js';
import { publishTokenTags } from './tag.service.js';

/**
 * Create token in Hedera network
 * @param token
 * @param user
 */
export async function createHederaToken(token: any, user: IRootConfig) {
    const topicHelper = new TopicHelper(user.hederaAccountId, user.hederaAccountKey, user.signOptions);
    const topic = await topicHelper.create({
        type: TopicType.TokenTopic,
        name: TopicType.TokenTopic,
        description: TopicType.TokenTopic,
        owner: user.did,
        policyId: null,
        policyUUID: null
    }, {
        admin: true,
        submit: false
    });
    await topic.saveKeys();
    await DatabaseServer.saveTopic(topic.toObject());

    const workers = new Workers();
    const tokenData = await workers.addNonRetryableTask({
        type: WorkerTaskType.CREATE_TOKEN,
        data: {
            operatorId: user.hederaAccountId,
            operatorKey: user.hederaAccountKey,
            memo: topic.topicId,
            ...token
        }
    }, 20);

    const wallet = new Wallet();
    await Promise.all([
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_TREASURY_KEY,
            tokenData.tokenId,
            tokenData.treasuryKey
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_ADMIN_KEY,
            tokenData.tokenId,
            tokenData.adminKey
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_FREEZE_KEY,
            tokenData.tokenId,
            tokenData.freezeKey
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_KYC_KEY,
            tokenData.tokenId,
            tokenData.kycKey
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_SUPPLY_KEY,
            tokenData.tokenId,
            tokenData.supplyKey
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_WIPE_KEY,
            tokenData.tokenId,
            tokenData.wipeKey
        )
    ]);

    return {
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
        enableWipe: !!tokenData.wipeKey || !!tokenData.wipeContractId,
        owner: user.did,
        policyId: null,
        draftToken: false,
        topicId: topic.topicId,
        wipeContractId: tokenData.wipeContractId,
    };
}

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
async function createToken(
    token: Token,
    user: IOwner,
    tokenRepository: DataBaseHelper<Token>,
    notifier: INotifier
): Promise<Token> {
    if (!token.tokenName) {
        throw new Error('Invalid Token Name');
    }

    if (!token.tokenSymbol) {
        throw new Error('Invalid Token Symbol');
    }

    notifier.start('Resolve Hedera account');
    const users = new Users();
    const root = await users.getHederaAccount(user.creator);

    notifier.completedAndStart('Create token');

    let rawTokenObject: any = {
        ...token,
        tokenId: GenerateUUIDv4(),
        adminId: null,
        creator: user.creator,
        owner: user.owner,
        policyId: null,
    };

    if (!token.draftToken) {
        rawTokenObject = await createHederaToken(rawTokenObject, root);
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
async function updateToken(
    oldToken: Token,
    newToken: Token,
    user: IOwner,
    tokenRepository: DataBaseHelper<Token>,
    notifier: INotifier
): Promise<Token> {
    if (oldToken.draftToken && newToken.draftToken) {
        notifier.start('Update token');
        const tokenObject = Object.assign(oldToken, newToken);
        const result = await tokenRepository.update(tokenObject, oldToken?.id);
        notifier.completed();

        return result;
    } else if (oldToken.draftToken && !newToken.draftToken) {
        notifier.start('Resolve Hedera account');
        const users = new Users();
        const root = await users.getHederaAccount(user.creator);

        notifier.completedAndStart('Create and save token in DB');

        const newTokenObject = await createHederaToken(newToken, root);
        const tokenObject = Object.assign(oldToken, newTokenObject);

        const result = await tokenRepository.update(tokenObject, oldToken?.id);

        notifier.completedAndStart('Publish tags');
        try {
            await publishTokenTags(result, root);
        } catch (error) {
            const log = new Logger();
            log.error(error, ['GUARDIAN_SERVICE, TAGS']);
        }

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

        const root = await users.getHederaAccount(user.creator);
        const adminKey = await wallet.getUserKey(
            user.owner,
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
        }, 20);

        notifier.completedAndStart('Save token in DB');

        oldToken.tokenName = newToken.tokenName;
        oldToken.tokenSymbol = newToken.tokenSymbol;

        const result = await tokenRepository.update(oldToken, oldToken?.id);

        const saveKeys = [];
        if (changes.enableFreeze) {
            saveKeys.push(wallet.setUserKey(
                user.owner,
                KeyType.TOKEN_FREEZE_KEY,
                tokenData.tokenId,
                tokenData.freezeKey
            ));
        }
        if (changes.enableKYC) {
            saveKeys.push(wallet.setUserKey(
                user.owner,
                KeyType.TOKEN_KYC_KEY,
                tokenData.tokenId,
                tokenData.kycKey
            ));
        }
        if (changes.enableWipe) {
            saveKeys.push(wallet.setUserKey(
                user.owner,
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
async function deleteToken(
    token: Token,
    user: IOwner,
    tokenRepository: DataBaseHelper<Token>,
    notifier: INotifier
): Promise<boolean> {
    if (!token.draftToken) {
        notifier.start('Resolve Hedera account');
        const users = new Users();
        const wallet = new Wallet();
        const workers = new Workers();

        const root = await users.getHederaAccount(user.creator);
        const adminKey = await wallet.getUserKey(
            user.owner,
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
        }, 20);
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
async function associateToken(
    tokenId: string,
    target: IOwner,
    associate: any,
    tokenRepository: DataBaseHelper<Token>,
    notifier: INotifier
): Promise<{ tokenName: string; status: boolean }> {
    notifier.start('Find token data');
    const token = await tokenRepository.findOne({ where: { tokenId: { $eq: tokenId } } });
    if (!token) {
        throw new Error('Token not found');
    }

    const wallet = new Wallet();
    const users = new Users();
    notifier.completedAndStart('Resolve Hedera account');
    const user = await users.getUserById(target.creator);
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
    }, 20);

    notifier.completed();
    return { tokenName: token.tokenName, status };
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
    owner: IOwner,
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

    const root = await users.getHederaAccount(owner.creator);

    notifier.completedAndStart(grant ? 'Grant KYC' : 'Revoke KYC');
    const workers = new Workers();
    const kycKey = await new Wallet().getUserKey(
        owner.owner,
        KeyType.TOKEN_KYC_KEY,
        token.tokenId
    );
    await workers.addNonRetryableTask({
        type: WorkerTaskType.GRANT_KYC_TOKEN,
        data: {
            hederaAccountId: root.hederaAccountId,
            hederaAccountKey: root.hederaAccountKey,
            userHederaAccountId: user.hederaAccountId,
            token,
            kycKey,
            grant
        }
    }, 20, user.id.toString());

    await new Promise(resolve => setTimeout(resolve, 15000));

    const info = await workers.addNonRetryableTask({
        type: WorkerTaskType.GET_ACCOUNT_INFO,
        data: {
            userID: root.hederaAccountId,
            userKey: root.hederaAccountKey,
            hederaAccountId: user.hederaAccountId,
        }
    }, 20, user.id.toString());

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
    owner: IOwner,
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

    const root = await users.getHederaAccount(owner.creator);

    notifier.completedAndStart(freeze ? 'Freeze Token' : 'Unfreeze Token');
    const workers = new Workers();
    const freezeKey = await new Wallet().getUserKey(
        owner.owner,
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
            token,
            freeze
        }
    }, 20, user.id.toString());

    await new Promise(resolve => setTimeout(resolve, 15000));

    const info = await workers.addNonRetryableTask({
        type: WorkerTaskType.GET_ACCOUNT_INFO,
        data: {
            userID: root.hederaAccountId,
            userKey: root.hederaAccountKey,
            hederaAccountId: user.hederaAccountId,
        }
    }, 20, user.id.toString());

    const result = getTokenInfo(info, token);
    notifier.completed();
    return result;
}

/**
 * Connect to the message broker methods of working with tokens.
 *
 * @param tokenRepository - table with tokens
 */
export async function tokenAPI(tokenRepository: DataBaseHelper<Token>): Promise<void> {
    /**
     * Create new token
     *
     * @param payload - token
     *
     * @returns all tokens
     */
    ApiResponse(MessageAPI.SET_TOKEN,
        async (msg: { item: Token, owner: IOwner }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid Params');
                }

                const { item, owner } = msg;

                await createToken(item, owner, tokenRepository, emptyNotifier());

                const tokens = await tokenRepository.findAll();
                return new MessageResponse(tokens);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SET_TOKEN_ASYNC,
        async (msg: { token: Token, owner: IOwner, task: any }) => {
            const { token, owner, task } = msg;
            const notifier = await initNotifier(task);

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

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.UPDATE_TOKEN,
        async (msg: { token: Token, owner: IOwner }) => {
            try {
                const { token, owner } = msg;
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const item = await tokenRepository.findOne({ tokenId: token.tokenId });
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Token not found');
                }

                return new MessageResponse(await updateToken(item, token, owner, tokenRepository, emptyNotifier()));
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.UPDATE_TOKEN_ASYNC,
        async (msg: { token: Token, owner: IOwner, task: any }) => {
            const { token, owner, task } = msg;
            const notifier = await initNotifier(task);
            RunFunctionAsync(async () => {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const item = await tokenRepository.findOne({ tokenId: token.tokenId });
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Token not found');
                }

                const result = await updateToken(item, token, owner, tokenRepository, notifier);
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.DELETE_TOKEN_ASYNC,
        async (msg: { tokenId: string, owner: IOwner, task: any }) => {
            const { tokenId, owner, task } = msg;
            const notifier = await initNotifier(task);
            RunFunctionAsync(async () => {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const item = await tokenRepository.findOne({ tokenId });
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Token not found');
                }
                const result = await deleteToken(item, owner, tokenRepository, notifier);
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.FREEZE_TOKEN,
        async (msg: { tokenId: string, username: string, owner: IOwner, freeze: boolean }) => {
            try {
                const { tokenId, username, owner, freeze } = msg;
                const result = await freezeToken(tokenId, username, owner, freeze, tokenRepository, emptyNotifier());
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error, 400);
            }
        });

    ApiResponse(MessageAPI.FREEZE_TOKEN_ASYNC,
        async (msg: { tokenId: string, username: string, owner: IOwner, freeze: boolean, task: any }) => {
            const { tokenId, username, owner, freeze, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const result = await freezeToken(tokenId, username, owner, freeze, tokenRepository, notifier);
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.KYC_TOKEN,
        async (msg: { tokenId: string, username: string, owner: IOwner, grant: boolean }) => {
            try {
                const { tokenId, username, owner, grant } = msg;
                const result = await grantKycToken(tokenId, username, owner, grant, tokenRepository, emptyNotifier());
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error, 400);
            }
        });

    ApiResponse(MessageAPI.KYC_TOKEN_ASYNC,
        async (msg: { tokenId: string, username: string, owner: IOwner, grant: boolean, task: any }) => {
            const { tokenId, username, owner, grant, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const result = await grantKycToken(tokenId, username, owner, grant, tokenRepository, notifier);
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.ASSOCIATE_TOKEN,
        async (msg: { tokenId: string, owner: IOwner, associate: boolean }) => {
            try {
                const { tokenId, owner, associate } = msg;
                const result = await associateToken(tokenId, owner, associate, tokenRepository, emptyNotifier());
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error, 400);
            }
        })

    ApiResponse(MessageAPI.ASSOCIATE_TOKEN_ASYNC,
        async (msg: { tokenId: string, owner: IOwner, associate: boolean, task: any }) => {
            const { tokenId, owner, associate, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const result = await associateToken(tokenId, owner, associate, tokenRepository, notifier);
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
        })

    ApiResponse(MessageAPI.GET_INFO_TOKEN,
        async (msg: { tokenId: string, username: string, owner: IOwner }) => {
            try {
                const { tokenId, username, owner } = msg;

                const users = new Users();
                const user = await users.getUser(username);
                if (!user) {
                    throw new Error('User not found');
                }

                const token = await tokenRepository.findOne({ tokenId });
                if (!token) {
                    throw new Error('Token not found');
                }

                if (!user.hederaAccountId) {
                    return new MessageResponse(getTokenInfo(null, token));
                }

                const root = await users.getHederaAccount(owner.creator);
                const workers = new Workers();
                const info = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_ACCOUNT_INFO,
                    data: {
                        userID: root.hederaAccountId,
                        userKey: root.hederaAccountKey,
                        hederaAccountId: user.hederaAccountId
                    }
                }, 20);

                const result = getTokenInfo(info, token);

                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error, 400);
            }
        })

    ApiResponse(MessageAPI.GET_ASSOCIATED_TOKENS,
        async (msg: { did: string, pageIndex: number, pageSize: number }) => {
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
                    return new ArrayMessageResponse([], 0);
                }

                const workers = new Workers();
                const info = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_ACCOUNT_INFO,
                    data: {
                        userID,
                        userKey,
                        hederaAccountId: user.hederaAccountId
                    }
                }, 20);

                const [tokens, count] = await tokenRepository.findAndCount(user.parent
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
                        20
                    )) || {};

                const result: any[] = [];
                for (const token of tokens) {
                    result.push(getTokenInfo(info, token, serials[token.tokenId]));
                }

                return new ArrayMessageResponse(result, count);
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
     * @returns tokens
     */
    ApiResponse(MessageAPI.GET_TOKENS,
        async (msg: { filters: any, owner: IOwner }) => {
            const { filters, owner } = msg;
            const option: any = {
                where: {
                    $or: [
                        { owner: { $eq: owner.owner } },
                        { owner: { $exists: false } }
                    ]
                }
            }
            if (filters.tokenId) {
                option.where.tokenId = filters.tokenId;
            }
            if (filters.ids) {
                option.where.tokenId = { $in: filters.ids };
            }
            const tokens = await tokenRepository.find(option);
            return new MessageResponse(tokens);
        })

    /**
     * Return tokens
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.tokenId] - token id
     * @param {string} [payload.did] - user did
     *
     * @returns {any[], number} - tokens and count
     */
    ApiResponse(MessageAPI.GET_TOKENS_PAGE,
        async (msg: { owner: IOwner, pageIndex: any, pageSize: any }): Promise<any> => {
            const { owner, pageIndex, pageSize } = msg;

            const options =
                (
                    typeof pageIndex === 'number' &&
                    typeof pageSize === 'number'
                ) ?
                    {
                        orderBy: {
                            createDate: OrderDirection.DESC,
                        },
                        limit: pageSize,
                        offset: pageIndex * pageSize,
                    }
                    : {
                        orderBy: {
                            createDate: OrderDirection.DESC,
                        },
                    };

            const [tokens, count] = await tokenRepository.findAndCount({
                $or: [
                    { owner: { $eq: owner.owner } },
                    { owner: { $exists: false } }
                ]
            }, options);
            return new ArrayMessageResponse(tokens, count);
        })

    /**
     * Return tokens V2 10.06.2024
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.tokenId] - token id
     * @param {string} [payload.did] - user did
     *
     * @returns {any[], number} - tokens and count
     */
    ApiResponse(MessageAPI.GET_TOKENS_PAGE_V2,
        async (msg: {fields: string[], owner: IOwner, pageIndex: any, pageSize: any }): Promise<any> => {
            const { fields, owner, pageIndex, pageSize } = msg;

            const options =
                (
                    typeof pageIndex === 'number' &&
                    typeof pageSize === 'number'
                ) ?
                    {
                        orderBy: {
                            createDate: OrderDirection.DESC,
                        },
                        limit: pageSize,
                        offset: pageIndex * pageSize,
                        fields
                    }
                    : {
                        orderBy: {
                            createDate: OrderDirection.DESC,
                        },
                        fields
                    };

            const [tokens, count] = await tokenRepository.findAndCount({
                $or: [
                    { owner: { $eq: owner.owner } },
                    { owner: { $exists: false } }
                ]
            }, options);
            return new ArrayMessageResponse(tokens, count);
        })

    /**
     * Return token
     *
     * @param {Object} [payload] - filters
     *
     * @returns token
     */
    ApiResponse(MessageAPI.GET_TOKEN,
        async (msg: { tokenId: string, owner: IOwner }) => {
            const { owner, tokenId } = msg;
            const token = await tokenRepository.findOne({
                tokenId,
                $or: [
                    { owner: { $eq: owner.owner } },
                    { owner: { $exists: false } }
                ]
            });
            return new MessageResponse(token);
        })

    /**
     * Get token serials
     */
    ApiResponse(MessageAPI.GET_SERIALS,
        async (msg: { tokenId: string, did: string }) => {
            try {
                const wallet = new Wallet();
                const users = new Users();
                const { did, tokenId } = msg;
                if (!did) {
                    throw new Error('DID is required');
                }
                if (!tokenId) {
                    throw new Error('Token identifier is required');
                }
                const user = await users.getUserById(did);
                const userID = user.hederaAccountId;
                const userDID = user.did;
                const userKey = await wallet.getKey(
                    user.walletToken,
                    KeyType.KEY,
                    userDID
                );
                const workers = new Workers();
                const serials =
                    (await workers.addNonRetryableTask(
                        {
                            type: WorkerTaskType.GET_USER_NFTS_SERIALS,
                            data: {
                                operatorId: userID,
                                operatorKey: userKey,
                                tokenId
                            },
                        },
                        20
                    ));
                return new MessageResponse(serials[tokenId] || []);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error, 400);
            }
        });
}
