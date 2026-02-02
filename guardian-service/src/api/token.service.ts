import { ApiResponse } from '../api/helpers/api-response.js';
import { ArrayMessageResponse, DatabaseServer, IAuthUser, INotificationStep, KeyType, MessageError, MessageResponse, NewNotifier, NotificationStep, PinoLogger, RunFunctionAsync, Token, TopicHelper, Users, Wallet, Workers } from '@guardian/common';
import { GenerateUUIDv4, IOwner, IRootConfig, MessageAPI, OrderDirection, TopicType, WorkerTaskType } from '@guardian/interfaces';
import { FilterObject } from '@mikro-orm/core';
import { publishTokenTags } from '../helpers/import-helpers/index.js'

/**
 * Create token in Hedera network
 * @param token
 * @param user
 * @param userId
 */
export async function createHederaToken(
    token: any,
    user: IRootConfig,
    userId: string | null
) {
    const topicHelper = new TopicHelper(user.hederaAccountId, user.hederaAccountKey, user.signOptions);
    const topic = await topicHelper.create(
        {
            type: TopicType.TokenTopic,
            name: TopicType.TokenTopic,
            description: TopicType.TokenTopic,
            owner: user.did,
            policyId: null,
            policyUUID: null
        },
        userId,
        {
            admin: true,
            submit: false
        });
    await topic.saveKeys(userId);
    await DatabaseServer.saveTopic(topic.toObject());

    const workers = new Workers();
    const tokenData = await workers.addNonRetryableTask({
        type: WorkerTaskType.CREATE_TOKEN,
        data: {
            operatorId: user.hederaAccountId,
            operatorKey: user.hederaAccountKey,
            memo: topic.topicId,
            payload: { userId },
            ...token
        }
    }, {
        priority: 20
    });

    const wallet = new Wallet();
    await Promise.all([
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_TREASURY_KEY,
            tokenData.tokenId,
            tokenData.treasuryKey,
            userId
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_ADMIN_KEY,
            tokenData.tokenId,
            tokenData.adminKey,
            userId
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_FREEZE_KEY,
            tokenData.tokenId,
            tokenData.freezeKey,
            userId
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_KYC_KEY,
            tokenData.tokenId,
            tokenData.kycKey,
            userId
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_SUPPLY_KEY,
            tokenData.tokenId,
            tokenData.supplyKey,
            userId
        ),
        wallet.setUserKey(
            user.did,
            KeyType.TOKEN_WIPE_KEY,
            tokenData.tokenId,
            tokenData.wipeKey,
            userId
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
 * @param dataBaseServer
 * @param notifier
 */
async function createToken(
    token: Token,
    user: IOwner,
    dataBaseServer: DatabaseServer,
    notifier: INotificationStep
): Promise<Token> {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_CREATE_TOKEN = 'Create token';
    const STEP_SAVE = 'Save';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_CREATE_TOKEN);
    notifier.addStep(STEP_SAVE);
    notifier.start();

    if (!token.tokenName) {
        throw new Error('Invalid Token Name');
    }

    if (!token.tokenSymbol) {
        throw new Error('Invalid Token Symbol');
    }

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const users = new Users();
    const root = await users.getHederaAccount(user.creator, user.id);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_CREATE_TOKEN);
    let rawTokenObject: any = {
        ...token,
        tokenId: GenerateUUIDv4(),
        adminId: null,
        creator: user.creator,
        owner: user.owner,
        policyId: null,
    };

    if (!token.draftToken) {
        rawTokenObject = await createHederaToken(rawTokenObject, root, user.id);
    }
    notifier.completeStep(STEP_CREATE_TOKEN);

    notifier.startStep(STEP_SAVE);
    const tokenObject = dataBaseServer.create(Token, rawTokenObject);
    const result = await dataBaseServer.save(Token, tokenObject);
    notifier.completeStep(STEP_SAVE);

    notifier.complete();
    return result;
}

/**
 * Update token
 * @param oldToken
 * @param newToken
 * @param user
 * @param dataBaseServer
 * @param notifier
 * @param log
 */
async function updateToken(
    oldToken: Token,
    newToken: Token,
    user: IOwner,
    dataBaseServer: DatabaseServer,
    notifier: INotificationStep,
    log: PinoLogger,
    userId: string
): Promise<Token> {
    if (oldToken.draftToken && newToken.draftToken) {
        // <-- Steps
        const STEP_UPDATE_TOKEN = 'Update token';
        // Steps -->

        notifier.addStep(STEP_UPDATE_TOKEN);
        notifier.start();

        notifier.startStep(STEP_UPDATE_TOKEN);
        const tokenObject = Object.assign(oldToken, newToken);
        const result = await dataBaseServer.update(Token, oldToken?.id, tokenObject);
        notifier.completeStep(STEP_UPDATE_TOKEN);

        notifier.complete();

        return result;
    } else if (oldToken.draftToken && !newToken.draftToken) {
        // <-- Steps
        const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
        const STEP_CREATE_TOKEN = 'Create and save token in DB';
        const STEP_PUBLISH_TAGS = 'Publish tags';
        // Steps -->

        notifier.addStep(STEP_RESOLVE_ACCOUNT);
        notifier.addStep(STEP_CREATE_TOKEN);
        notifier.addStep(STEP_PUBLISH_TAGS);
        notifier.start();

        notifier.startStep(STEP_RESOLVE_ACCOUNT);
        const users = new Users();
        const root = await users.getHederaAccount(user.creator, user.id);
        notifier.completeStep(STEP_RESOLVE_ACCOUNT);

        notifier.startStep(STEP_CREATE_TOKEN);
        const newTokenObject = await createHederaToken(newToken, root, user.id);
        const tokenObject = Object.assign(oldToken, newTokenObject);

        const result = await dataBaseServer.update(Token, oldToken?.id, tokenObject);
        notifier.completeStep(STEP_CREATE_TOKEN);

        notifier.startStep(STEP_PUBLISH_TAGS);
        try {
            await publishTokenTags(result, user, root, userId);
        } catch (error) {
            log.error(error, ['GUARDIAN_SERVICE, TAGS'], userId);
        }
        notifier.completeStep(STEP_PUBLISH_TAGS);

        notifier.complete();
        return result;

    } else {
        // <-- Steps
        const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
        const STEP_UPDATE_TOKEN = 'Update token';
        const STEP_SAVE = 'Save token in DB';
        // Steps -->

        notifier.addStep(STEP_RESOLVE_ACCOUNT);
        notifier.addStep(STEP_UPDATE_TOKEN);
        notifier.addStep(STEP_SAVE);
        notifier.start();

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

        notifier.startStep(STEP_RESOLVE_ACCOUNT);
        const users = new Users();
        const wallet = new Wallet();
        const workers = new Workers();

        const root = await users.getHederaAccount(user.creator, user.id);
        const adminKey = await wallet.getUserKey(
            user.owner,
            KeyType.TOKEN_ADMIN_KEY,
            oldToken.tokenId,
            user.id
        );
        notifier.completeStep(STEP_RESOLVE_ACCOUNT);

        notifier.startStep(STEP_UPDATE_TOKEN);
        const tokenData = await workers.addNonRetryableTask({
            type: WorkerTaskType.UPDATE_TOKEN,
            data: {
                tokenId: oldToken.tokenId,
                operatorId: root.hederaAccountId,
                operatorKey: root.hederaAccountKey,
                adminKey,
                changes,
                payload: { userId: user.id }
            }
        }, {
            priority: 20
        });
        notifier.completeStep(STEP_UPDATE_TOKEN);

        notifier.startStep(STEP_SAVE);
        oldToken.tokenName = newToken.tokenName;
        oldToken.tokenSymbol = newToken.tokenSymbol;

        const result = await dataBaseServer.update(Token, oldToken?.id, oldToken);

        const saveKeys = [];
        if (changes.enableFreeze) {
            saveKeys.push(wallet.setUserKey(
                user.owner,
                KeyType.TOKEN_FREEZE_KEY,
                tokenData.tokenId,
                tokenData.freezeKey,
                user.id
            ));
        }
        if (changes.enableKYC) {
            saveKeys.push(wallet.setUserKey(
                user.owner,
                KeyType.TOKEN_KYC_KEY,
                tokenData.tokenId,
                tokenData.kycKey,
                user.id
            ));
        }
        if (changes.enableWipe) {
            saveKeys.push(wallet.setUserKey(
                user.owner,
                KeyType.TOKEN_WIPE_KEY,
                tokenData.tokenId,
                tokenData.wipeKey,
                user.id
            ));
        }
        await Promise.all(saveKeys);
        notifier.completeStep(STEP_SAVE);

        notifier.complete();
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
    dataBaseServer: DatabaseServer,
    notifier: INotificationStep
): Promise<boolean> {
    if (!token.draftToken) {
        // <-- Steps
        const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
        const STEP_DELETE_TOKEN = 'Delete token';
        const STEP_SAVE = 'Save token in DB';
        // Steps -->

        notifier.addStep(STEP_RESOLVE_ACCOUNT);
        notifier.addStep(STEP_DELETE_TOKEN);
        notifier.addStep(STEP_SAVE);
        notifier.start();

        notifier.startStep(STEP_RESOLVE_ACCOUNT);
        const users = new Users();
        const wallet = new Wallet();
        const workers = new Workers();

        const root = await users.getHederaAccount(user.creator, user.id);
        const adminKey = await wallet.getUserKey(
            user.owner,
            KeyType.TOKEN_ADMIN_KEY,
            token.tokenId,
            user.id
        );
        notifier.completeStep(STEP_RESOLVE_ACCOUNT);

        notifier.startStep(STEP_DELETE_TOKEN);
        const tokenData = await workers.addNonRetryableTask({
            type: WorkerTaskType.DELETE_TOKEN,
            data: {
                tokenId: token.tokenId,
                operatorId: root.hederaAccountId,
                operatorKey: root.hederaAccountKey,
                adminKey,
                payload: { userId: user.id }
            }
        }, {
            priority: 20
        });
        notifier.completeStep(STEP_DELETE_TOKEN);

        notifier.startStep(STEP_SAVE);
        if (tokenData) {
            await dataBaseServer.deleteEntity(Token, token);
        }
        notifier.completeStep(STEP_SAVE);

        notifier.complete();
    } else {
        // <-- Steps
        const STEP_DELETE_TOKEN = 'Delete token from db';
        // Steps -->

        notifier.addStep(STEP_DELETE_TOKEN);
        notifier.start();

        notifier.startStep(STEP_DELETE_TOKEN);
        await dataBaseServer.deleteEntity(Token, token);
        notifier.completeStep(STEP_DELETE_TOKEN);

        notifier.complete();
    }

    return true;
}

/**
 * Associate/dissociate token
 * @param tokenId
 * @param did
 * @param associate
 * @param dataBaseServer
 * @param notifier
 */
async function associateToken(
    tokenId: string,
    accountId: string | null,
    target: IOwner,
    associate: any,
    dataBaseServer: DatabaseServer,
    notifier: INotificationStep
): Promise<{ tokenName: string; status: boolean }> {
    // <-- Steps
    const STEP_FIND_TOKEN = 'Find token data';
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_ACTION = associate ? 'Associate' : 'Dissociate';
    // Steps -->

    notifier.addStep(STEP_FIND_TOKEN);
    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_ACTION);
    notifier.start();

    notifier.startStep(STEP_FIND_TOKEN);
    const token = await dataBaseServer.findOne(Token, { tokenId: { $eq: tokenId } });
    if (!token) {
        throw new Error('Token not found');
    }
    notifier.completeStep(STEP_FIND_TOKEN);

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const users = new Users();
    const user = await users.getUserById(target.creator, target.id);
    if (!user) {
        throw new Error('User not found');
    }

    const account: any = await users.getUserRelayerAccount(target.creator, accountId, target.id);
    if (!account) {
        throw new Error('Hedera Account not found');
    }
    if (account.default) {
        account.key = await (new Wallet()).getKey(user.walletToken, KeyType.KEY, user.did);
    } else {
        account.key = await (new Wallet()).getKey(user.walletToken, KeyType.RELAYER_ACCOUNT, `${user.did}/${account.account}`);
    }
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_ACTION);
    const workers = new Workers();
    const status = await workers.addNonRetryableTask({
        type: WorkerTaskType.ASSOCIATE_TOKEN,
        data: {
            tokenId,
            userID: account.account,
            userKey: account.key,
            associate,
            payload: { userId: user.id }
        }
    }, {
        priority: 20
    });
    notifier.completeStep(STEP_ACTION);

    notifier.complete();
    return { tokenName: token.tokenName, status };
}

/**
 * Grant/revoke KYC
 * @param tokenId
 * @param username
 * @param owner
 * @param grant
 * @param dataBaseServer
 * @param notifier
 */
async function grantKycToken(
    tokenId: any,
    username: string,
    owner: IOwner,
    grant: boolean,
    dataBaseServer: DatabaseServer,
    notifier: INotificationStep
): Promise<any> {
    // <-- Steps
    const STEP_FIND_TOKEN = 'Find token data';
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_ACTION = grant ? 'Grant KYC' : 'Revoke KYC';
    // Steps -->

    notifier.addStep(STEP_FIND_TOKEN);
    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_ACTION);
    notifier.start();

    notifier.startStep(STEP_FIND_TOKEN);
    const token = await dataBaseServer.findOne(Token, { tokenId: { $eq: tokenId } });
    if (!token) {
        throw new Error('Token not found');
    }
    notifier.completeStep(STEP_FIND_TOKEN);

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const users = new Users();
    const user = await users.getUser(username, owner.id);
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.hederaAccountId) {
        throw new Error('User is not linked to an Hedera Account');
    }

    const root = await users.getHederaAccount(owner.creator, owner.id);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_ACTION);
    const workers = new Workers();
    const kycKey = await new Wallet().getUserKey(
        owner.owner,
        KeyType.TOKEN_KYC_KEY,
        token.tokenId,
        owner.id
    );
    await workers.addNonRetryableTask({
        type: WorkerTaskType.GRANT_KYC_TOKEN,
        data: {
            hederaAccountId: root.hederaAccountId,
            hederaAccountKey: root.hederaAccountKey,
            userHederaAccountId: user.hederaAccountId,
            token,
            kycKey,
            grant,
            payload: { userId: user.id }
        }
    }, {
        priority: 20,
        attempts: 0,
        userId: user.id.toString(),
        interception: user.id.toString(),
        registerCallback: true
    });

    await new Promise(resolve => setTimeout(resolve, 15000));

    const info = await workers.addNonRetryableTask({
        type: WorkerTaskType.GET_ACCOUNT_INFO,
        data: {
            userID: root.hederaAccountId,
            userKey: root.hederaAccountKey,
            hederaAccountId: user.hederaAccountId,
            payload: { userId: user.id }
        }
    }, {
        priority: 20,
        attempts: 0,
        userId: user.id.toString(),
        interception: user.id.toString(),
        registerCallback: true
    });

    const result = getTokenInfo(info, token);
    notifier.completeStep(STEP_ACTION);

    notifier.complete();
    return result;
}

/**
 * Freeze/unfreeze token
 * @param tokenId
 * @param username
 * @param owner
 * @param freeze
 * @param dataBaseServer
 * @param notifier
 */
async function freezeToken(
    tokenId: any,
    username: string,
    owner: IOwner,
    freeze: boolean,
    dataBaseServer: DatabaseServer,
    notifier: INotificationStep
): Promise<any> {
    // <-- Steps
    const STEP_FIND_TOKEN = 'Find token data';
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_ACTION = freeze ? 'Freeze Token' : 'Unfreeze Token';
    // Steps -->

    notifier.addStep(STEP_FIND_TOKEN);
    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_ACTION);
    notifier.start();

    notifier.startStep(STEP_FIND_TOKEN);
    const token = await dataBaseServer.findOne(Token, { tokenId: { $eq: tokenId } });
    if (!token) {
        throw new Error('Token not found');
    }
    notifier.completeStep(STEP_FIND_TOKEN);

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const users = new Users();
    const user = await users.getUser(username, owner.id);
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.hederaAccountId) {
        throw new Error('User is not linked to an Hedera Account');
    }

    const root = await users.getHederaAccount(owner.creator, owner.id);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_ACTION);
    const workers = new Workers();
    const freezeKey = await new Wallet().getUserKey(
        owner.owner,
        KeyType.TOKEN_FREEZE_KEY,
        token.tokenId,
        owner.id
    );
    await workers.addNonRetryableTask({
        type: WorkerTaskType.FREEZE_TOKEN,
        data: {
            hederaAccountId: root.hederaAccountId,
            hederaAccountKey: root.hederaAccountKey,
            userHederaAccountId: user.hederaAccountId,
            freezeKey,
            token,
            freeze,
            payload: { userId: user.id }
        }
    }, {
        priority: 20,
        attempts: 0,
        userId: user.id.toString(),
        interception: user.id.toString(),
        registerCallback: true
    });

    await new Promise(resolve => setTimeout(resolve, 15000));

    const info = await workers.addNonRetryableTask({
        type: WorkerTaskType.GET_ACCOUNT_INFO,
        data: {
            userID: root.hederaAccountId,
            userKey: root.hederaAccountKey,
            hederaAccountId: user.hederaAccountId,
            payload: { userId: user.id }
        }
    }, {
        priority: 20,
        attempts: 0,
        userId: user.id.toString(),
        interception: user.id.toString(),
        registerCallback: true
    });

    const result = getTokenInfo(info, token);
    notifier.completeStep(STEP_ACTION);

    notifier.complete();
    return result;
}

/**
 * Connect to the message broker methods of working with tokens.
 *
 * @param dataBaseServer
 * @param logger
 */
export async function tokenAPI(dataBaseServer: DatabaseServer, logger: PinoLogger): Promise<void> {
    /**
     * Create new token
     *
     * @param payload - token
     *
     * @returns all tokens
     */
    ApiResponse(MessageAPI.SET_TOKEN,
        async (msg: {
            item: Token,
            owner: IOwner,
            userId: string | null
        }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid Params');
                }

                const { item, owner } = msg;

                await createToken(item, owner, dataBaseServer, NewNotifier.empty());

                const tokens = await dataBaseServer.findAll(Token);
                return new MessageResponse(tokens);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SET_TOKEN_ASYNC,
        async (msg: {
            token: Token,
            owner: IOwner,
            task: any
        }) => {
            const { token, owner, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const result = await createToken(token, owner, dataBaseServer, notifier);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.UPDATE_TOKEN,
        async (msg: {
            token: Token,
            owner: IOwner
        }) => {
            try {
                const { token, owner } = msg;
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const item = await dataBaseServer.findOne(Token, { tokenId: token.tokenId });
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Token not found');
                }

                return new MessageResponse(
                    await updateToken(item, token, owner, dataBaseServer, NewNotifier.empty(), logger, owner?.id)
                );
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.UPDATE_TOKEN_ASYNC,
        async (msg: {
            token: Token,
            owner: IOwner,
            task: any
        }) => {
            const { token, owner, task } = msg;
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(async () => {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const item = await dataBaseServer.findOne(Token, { tokenId: token.tokenId });
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Token not found');
                }

                const result = await updateToken(item, token, owner, dataBaseServer, notifier, logger, owner?.id);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.DELETE_TOKEN_ASYNC,
        async (msg: {
            tokenId: string,
            owner: IOwner,
            task: any
        }) => {
            const { tokenId, owner, task } = msg;
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(async () => {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const item = await dataBaseServer.findOne(Token, { tokenId });
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Token not found');
                }
                const result = await deleteToken(item, owner, dataBaseServer, notifier);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                notifier.fail(error);
            });
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.DELETE_TOKENS_ASYNC,
        async (msg: {
            tokenIds: string[],
            owner: IOwner,
            task: any
        }) => {
            const { tokenIds, owner, task } = msg;
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(async () => {
                if (!msg) {
                    throw new Error('Invalid Params');
                }

                const items = await dataBaseServer.find(Token, { tokenId: { $in: tokenIds }, owner: owner.owner });
                if (!items || items?.length <= 0) {
                    throw new Error('Token not found');
                }

                const stepMap = new Map<string, NotificationStep>();
                const results = new Map<string, boolean>();

                for (const item of items) {
                    const STEP_DELETE_TOKEN = 'DELETE TOKEN (' + item.tokenName + ')';
                    const deleteTokenStep = notifier.addStep(STEP_DELETE_TOKEN);
                    stepMap.set(item.tokenId, deleteTokenStep);
                }

                for (const item of items) {
                    const deleteTokenStep = stepMap.get(item.tokenId);
                    const result = await deleteToken(item, owner, dataBaseServer, deleteTokenStep);
                    results.set(item.tokenId, result);
                }

                notifier.result(results);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                notifier.fail(error);
            });
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.FREEZE_TOKEN,
        async (msg: {
            tokenId: string,
            username: string,
            owner: IOwner,
            freeze: boolean
        }) => {
            try {
                const { tokenId, username, owner, freeze } = msg;
                const result = await freezeToken(tokenId, username, owner, freeze, dataBaseServer, NewNotifier.empty());
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error, 400);
            }
        });

    ApiResponse(MessageAPI.FREEZE_TOKEN_ASYNC,
        async (msg: {
            tokenId: string,
            username: string,
            owner: IOwner,
            freeze: boolean,
            task: any
        }) => {
            const { tokenId, username, owner, freeze, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                const result = await freezeToken(tokenId, username, owner, freeze, dataBaseServer, notifier);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.KYC_TOKEN,
        async (msg: {
            tokenId: string,
            username: string,
            owner: IOwner,
            grant: boolean
        }) => {
            try {
                const { tokenId, username, owner, grant } = msg;
                const result = await grantKycToken(tokenId, username, owner, grant, dataBaseServer, NewNotifier.empty());
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error, 400);
            }
        });

    ApiResponse(MessageAPI.KYC_TOKEN_ASYNC,
        async (msg: {
            tokenId: string,
            username: string,
            owner: IOwner,
            grant: boolean,
            task: any
        }) => {
            const { tokenId, username, owner, grant, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                const result = await grantKycToken(tokenId, username, owner, grant, dataBaseServer, notifier);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.ASSOCIATE_TOKEN,
        async (msg: {
            tokenId: string,
            accountId: string | null,
            owner: IOwner,
            associate: boolean
        }) => {
            try {
                const { tokenId, accountId, owner, associate } = msg;
                const result = await associateToken(tokenId, accountId, owner, associate, dataBaseServer, NewNotifier.empty());
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error, 400);
            }
        })

    ApiResponse(MessageAPI.ASSOCIATE_TOKEN_ASYNC,
        async (msg: {
            tokenId: string,
            accountId: string | null,
            owner: IOwner,
            associate: boolean,
            task: any
        }) => {
            const { tokenId, accountId, owner, associate, task } = msg;
            const notifier = await NewNotifier.create(task);

            RunFunctionAsync(async () => {
                const result = await associateToken(tokenId, accountId, owner, associate, dataBaseServer, notifier);
                notifier.result(result);
            }, async (error) => {
                await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                notifier.fail(error);
            });

            return new MessageResponse(task);
        })

    ApiResponse(MessageAPI.GET_INFO_TOKEN,
        async (msg: {
            tokenId: string,
            username: string,
            owner: IOwner
        }) => {
            try {
                const { tokenId, username, owner } = msg;

                const users = new Users();
                const user = await users.getUser(username, owner?.id);
                if (!user) {
                    throw new Error('User not found');
                }

                const token = await dataBaseServer.findOne(Token, { tokenId });
                if (!token) {
                    throw new Error('Token not found');
                }

                if (!user.hederaAccountId) {
                    return new MessageResponse(getTokenInfo(null, token));
                }

                const root = await users.getHederaAccount(owner.creator, owner?.id);
                const workers = new Workers();
                const info = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_ACCOUNT_INFO,
                    data: {
                        userID: root.hederaAccountId,
                        userKey: root.hederaAccountKey,
                        hederaAccountId: user.hederaAccountId,
                        payload: { userId: owner?.id }
                    }
                }, {
                    priority: 20
                });

                const result = getTokenInfo(info, token);

                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error, 400);
            }
        })

    ApiResponse(MessageAPI.GET_RELAYER_ACCOUNT_INFO,
        async (msg: {
            tokenId: string,
            relayerAccountId: string,
            owner: IOwner,
            user: IAuthUser
        }) => {
            try {
                const { tokenId, relayerAccountId, owner, user } = msg;

                const users = new Users();
                if (owner) {
                    const wallet = await users.getUserRelayerAccount(owner.creator, relayerAccountId, user?.id);
                    if (!wallet) {
                        return new MessageError('Wallet not found.', 500);
                    }
                } else {
                    const wallet = await users.getRelayerAccount(relayerAccountId, user?.id);
                    if (!wallet) {
                        return new MessageError('Wallet not found.', 500);
                    }
                }

                const token = await dataBaseServer.findOne(Token, { tokenId });
                if (!token) {
                    return new MessageError('Wallet not found.', 500);
                }

                const workers = new Workers();
                const info = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_ACCOUNT_TOKENS_REST,
                    data: {
                        hederaAccountId: relayerAccountId,
                        payload: { userId: user?.id }
                    }
                }, {
                    priority: 20
                });

                const result = getTokenInfo(info, token);

                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error, 400);
            }
        })

    ApiResponse(MessageAPI.GET_ASSOCIATED_TOKENS,
        async (msg: {
            owner: IOwner,
            did: string,
            pageIndex: number,
            pageSize: number
        }) => {
            try {
                const { owner, did, pageIndex, pageSize } = msg;

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

                const users = new Users();
                const user = await users.getUserById(did, owner?.id);

                if (!user) {
                    throw new Error('User not found');
                }

                if (!user.hederaAccountId) {
                    return new ArrayMessageResponse([], 0);
                }

                const [tokens, count] = await dataBaseServer.findAndCount(Token,
                    user.parent ? {
                        $or: [
                            { owner: { $eq: user.parent } },
                            { owner: { $exists: false } },
                            { owner: null },
                        ]
                    } as FilterObject<Token> : {},
                    options
                );

                const workers = new Workers();
                const [info, serials] = await Promise.all([
                    workers.addNonRetryableTask({
                        type: WorkerTaskType.GET_ACCOUNT_TOKENS_REST,
                        data: {
                            hederaAccountId: user.hederaAccountId,
                            payload: { userId: owner?.id }
                        }
                    }, {
                        priority: 20
                    }),
                    workers.addNonRetryableTask({
                        type: WorkerTaskType.GET_USER_NFTS_SERIALS,
                        data: {
                            hederaAccountId: user.hederaAccountId,
                            payload: { userId: owner?.id }
                        },
                    }, {
                        priority: 20
                    })
                ])

                const result: any[] = [];
                for (const token of tokens) {
                    result.push(getTokenInfo(info, token, serials?.[token.tokenId]));
                }

                return new ArrayMessageResponse(result, count);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
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
        async (msg: {
            filters: any,
            owner: IOwner
        }) => {
            const { filters, owner } = msg;
            const option: any = {
                $or: [
                    { owner: { $eq: owner.owner } },
                    { owner: { $exists: false } }
                ]
            }
            if (filters.tokenId) {
                option.tokenId = filters.tokenId;
            }
            if (filters.ids) {
                option.tokenId = { $in: filters.ids };
            }
            const tokens = await dataBaseServer.find(Token, option);
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
        async (msg: {
            owner: IOwner,
            pageIndex: any,
            pageSize: any
        }): Promise<any> => {
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

            const [tokens, count] = await dataBaseServer.findAndCount(Token, {
                $or: [
                    { owner: { $eq: owner.owner } },
                    { owner: { $exists: false } }
                ]
            } as FilterObject<Token>, options);
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
        async (msg: {
            fields: string[],
            owner: IOwner,
            pageIndex: any,
            pageSize: any
        }): Promise<any> => {
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

            const [tokens, count] = await dataBaseServer.findAndCount(Token, {
                $or: [
                    { owner: { $eq: owner.owner } },
                    { owner: { $exists: false } }
                ]
            } as FilterObject<Token>, options);
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
            const token = await dataBaseServer.findOne(Token, {
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
        async (msg: {
            owner: IOwner,
            tokenId: string,
            did: string
        }) => {
            try {
                const users = new Users();
                const { owner, did, tokenId } = msg;
                if (!did) {
                    throw new Error('DID is required');
                }
                if (!tokenId) {
                    throw new Error('Token identifier is required');
                }
                const user = await users.getUserById(did, owner?.id);
                const workers = new Workers();
                const serials =
                    (await workers.addNonRetryableTask(
                        {
                            type: WorkerTaskType.GET_USER_NFTS_SERIALS,
                            data: {
                                hederaAccountId: user.hederaAccountId,
                                tokenId,
                                payload: { userId: owner?.id }
                            },
                        },
                        {
                            priority: 20
                        }
                    ));
                return new MessageResponse(serials[tokenId] || []);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error, 400);
            }
        });
}
