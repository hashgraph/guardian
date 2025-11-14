import { DatabaseServer, IAuthUser, KeyType, MessageError, MessageResponse, NatsService, PinoLogger, Singleton, Wallet, Workers } from '@guardian/common';
import { AuthEvents, GenerateUUIDv4, WorkerTaskType } from '@guardian/interfaces';
import { RelayerAccount } from '../entity/relayer-account.js';
import { User } from '../entity/user.js';
import { UserUtils } from '#utils';

/**
 * Relayer account service
 */
@Singleton
export class RelayerAccountsService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'auth-relayer-accounts-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'auth-relayer-accounts-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listeners
     */
    registerListeners(logger: PinoLogger): void {
        /**
         * Get relayer account balance
         * @param user - user
         * @param account - account
         *
         * @returns {any[]} balance
         */
        this.getMessages(AuthEvents.GET_RELAYER_ACCOUNT_BALANCE,
            async (msg: {
                user: IAuthUser,
                account: string
            }) => {
                try {
                    const { user, account } = msg;

                    const entityRepository = new DatabaseServer();
                    const relayerAccountRow = await entityRepository.findOne(RelayerAccount, {
                        account,
                        $or: [{
                            owner: user.did
                        }, {
                            parent: user.did
                        }]
                    });

                    let relayerAccount: string;
                    if (relayerAccountRow) {
                        relayerAccount = relayerAccountRow.account;
                    } else {
                        const userAccount = await entityRepository.findOne(User, {
                            hederaAccountId: account,
                            $or: [{
                                did: user.did
                            }, {
                                parent: user.did
                            }]
                        });
                        if (userAccount) {
                            relayerAccount = userAccount.hederaAccountId;
                        } else {
                            return new MessageError('Relayer account does not exist.');
                        }
                    }

                    const workers = new Workers();
                    const balance = await workers.addNonRetryableTask({
                        type: WorkerTaskType.GET_USER_BALANCE_REST,
                        data: {
                            hederaAccountId: relayerAccount
                        }
                    }, {
                        priority: 20,
                        attempts: 0,
                        userId: user.id,
                        interception: null
                    });
                    return new MessageResponse(balance);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Get current relayer account
         * @param user - user
         *
         * @returns {any} relayer account
         */
        this.getMessages(AuthEvents.GET_CURRENT_RELAYER_ACCOUNT,
            async (msg: {
                user: IAuthUser
            }) => {
                try {
                    const { user } = msg;

                    const entityRepository = new DatabaseServer();
                    const target = await entityRepository.findOne(User, {
                        did: user.did
                    });
                    if (!target && target.did) {
                        return new MessageError('User does not exist.');
                    }

                    return new MessageResponse({
                        name: 'Default',
                        owner: user.did,
                        account: user.hederaAccountId
                    });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Get relayer accounts
         * @param user - user
         *
         * @returns {any[]} relayer accounts
         */
        this.getMessages(AuthEvents.GET_RELAYER_ACCOUNTS,
            async (msg: {
                user: IAuthUser,
                filters: {
                    search?: string,
                    pageIndex?: number | string,
                    pageSize?: number | string
                }
            }) => {
                try {
                    const { user, filters } = msg;
                    const { search, pageIndex, pageSize } = filters;

                    const entityRepository = new DatabaseServer();
                    const target = await entityRepository.findOne(User, {
                        did: user.did
                    });
                    if (!target && target.did) {
                        return new MessageError('User does not exist.');
                    }

                    const otherOptions: any = {};
                    const _pageSize = parseInt(String(pageSize), 10);
                    const _pageIndex = parseInt(String(pageIndex), 10);
                    if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                        otherOptions.orderBy = { createDate: 'DESC' };
                        otherOptions.limit = _pageSize;
                        otherOptions.offset = _pageIndex * _pageSize;
                    } else {
                        otherOptions.orderBy = { createDate: 'DESC' };
                        otherOptions.limit = 100;
                    }

                    const query: any = {
                        owner: user.did
                    };
                    if (search) {
                        query.$or = [{
                            name: { $regex: '.*' + search + '.*', $options: 'i' },
                        }, {
                            account: { $regex: '.*' + search + '.*', $options: 'i' }
                        }]
                    }

                    const [items, count] = await entityRepository.findAndCount(RelayerAccount, query, otherOptions);

                    return new MessageResponse({ items, count });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Get relayer accounts
         * @param user - user
         *
         * @returns {any[]} relayer accounts
         */
        this.getMessages(AuthEvents.GET_RELAYER_ACCOUNTS_ALL,
            async (msg: {
                user: IAuthUser
            }) => {
                try {
                    const { user } = msg;

                    const entityRepository = new DatabaseServer();
                    const target = await entityRepository.findOne(User, {
                        did: user.did
                    });
                    if (!target && target.did) {
                        return new MessageError('User does not exist.');
                    }

                    const results = await entityRepository.find(RelayerAccount, {
                        owner: user.did
                    });

                    return new MessageResponse(results);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Create relayer account
         * @param user - user
         * @param config - config
         *
         * @returns {any} relayer account
         */
        this.getMessages(AuthEvents.CREATE_RELAYER_ACCOUNT,
            async (msg: {
                user: IAuthUser,
                config: {
                    name?: string,
                    account?: string,
                    key?: string
                }
            }) => {
                try {
                    const { user, config } = msg;

                    const entityRepository = new DatabaseServer();
                    const target = await entityRepository.findOne(User, {
                        did: user.did
                    });
                    if (!target && target.did) {
                        return new MessageError('User does not exist.');
                    }
                    if (!config) {
                        return new MessageError('Invalid config.');
                    }

                    const newRelayerAccount = {
                        name: config.name,
                        account: config.account,
                        owner: target.did,
                        parent: target.parent,
                        username: target.username
                    }
                    const key = config.key;

                    const accountBalance = await UserUtils.checkAccount(config.account, config.key);
                    if (accountBalance === null) {
                        return new MessageError('Invalid account.');
                    }

                    const old = await entityRepository.findOne(RelayerAccount, {
                        account: newRelayerAccount.account,
                        owner: newRelayerAccount.owner
                    });
                    if (old) {
                        return new MessageError('Relayer account already exist.');
                    }

                    const walletHelper = new Wallet();
                    const userFull = await entityRepository.findOne(User, { did: user.did });
                    await walletHelper.setKey(userFull.walletToken, KeyType.RELAYER_ACCOUNT, `${newRelayerAccount.owner}/${newRelayerAccount.account}`, key);

                    let item = entityRepository.create(RelayerAccount, newRelayerAccount);
                    item = await entityRepository.save(RelayerAccount, item);

                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Generate relayer account
         * @param user - user
         *
         * @returns {any} account
         */
        this.getMessages(AuthEvents.GENERATE_RELAYER_ACCOUNT,
            async (msg: {
                user: IAuthUser
            }) => {
                try {
                    const { user } = msg;

                    const entityRepository = new DatabaseServer();
                    const target = await entityRepository.findOne(User, {
                        did: user.did
                    });
                    if (!target && target.did) {
                        return new MessageError('User does not exist.');
                    }

                    const account = await UserUtils.generateAccount(target, user.id);
                    return new MessageResponse(account);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Get user relayer account
         * @param did - DID
         */
        this.getMessages(AuthEvents.GET_USER_RELAYER_ACCOUNT,
            async (msg: {
                did: string,
                relayerAccount: string,
                userId: string | null
            }) => {
                const { did, relayerAccount, userId } = msg;
                try {
                    const entityRepository = new DatabaseServer();
                    if (relayerAccount) {
                        const relayerAccountRow = await entityRepository.findOne(RelayerAccount, {
                            account: relayerAccount,
                            owner: did
                        });
                        if (relayerAccountRow) {
                            return new MessageResponse({
                                account: relayerAccountRow.account,
                                name: relayerAccountRow.name,
                                default: false
                            });
                        }
                    }
                    const user = await entityRepository.findOne(User, { did });
                    if (!relayerAccount || relayerAccount === user.hederaAccountId) {
                        return new MessageResponse({
                            name: 'Default',
                            account: user.hederaAccountId,
                            default: true
                        });
                    }
                    return new MessageError('Relayer account not found.');
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get user relayer accounts
         * @param user - user
         *
         * @returns {any[]} relayer accounts
         */
        this.getMessages(AuthEvents.GET_USER_RELAYER_ACCOUNTS,
            async (msg: {
                user: IAuthUser,
                filters: {
                    search?: string,
                    pageIndex?: number | string,
                    pageSize?: number | string
                }
            }) => {
                try {
                    const { user, filters } = msg;
                    const { search, pageIndex, pageSize } = filters;

                    const entityRepository = new DatabaseServer();
                    const target = await entityRepository.findOne(User, {
                        did: user.did
                    });
                    if (!target && target.did) {
                        return new MessageError('User does not exist.');
                    }

                    const otherOptions: any = {};
                    const _pageSize = parseInt(String(pageSize), 10);
                    const _pageIndex = parseInt(String(pageIndex), 10);
                    if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                        otherOptions.orderBy = { createDate: 'DESC' };
                        otherOptions.limit = _pageSize;
                        otherOptions.offset = _pageIndex * _pageSize;
                    } else {
                        otherOptions.orderBy = { createDate: 'DESC' };
                        otherOptions.limit = 100;
                    }

                    const aggregate: any[] = [{
                        $match: {
                            $or: [{
                                parent: user.did
                            }, {
                                did: user.did
                            }]
                        }
                    }, {
                        $lookup: {
                            from: 'relayer_account',
                            localField: 'did',
                            foreignField: 'owner',
                            as: 'relayerAccounts'
                        }
                    }, {
                        $project: {
                            username: '$username',
                            did: '$did',
                            parent: '$parent',
                            hederaAccountId: '$hederaAccountId',
                            relayerAccounts: {
                                $concatArrays: [[null], '$relayerAccounts']
                            }
                        }
                    }, {
                        $unwind: {
                            path: '$relayerAccounts',
                            preserveNullAndEmptyArrays: true
                        }
                    }, {
                        $project: {
                            username: '$username',
                            did: '$did',
                            parent: '$parent',
                            hederaAccountId: '$hederaAccountId',
                            relayerAccountId: '$relayerAccounts.account',
                            relayerAccountName: '$relayerAccounts.name'
                        }
                    }];

                    if (search) {
                        aggregate.push({
                            $match: {
                                $or: [{
                                    username: { $regex: '.*' + search + '.*', $options: 'i' },
                                }, {
                                    hederaAccountId: { $regex: '.*' + search + '.*', $options: 'i' }
                                }, {
                                    relayerAccountId: { $regex: '.*' + search + '.*', $options: 'i' }
                                }, {
                                    relayerAccountName: { $regex: '.*' + search + '.*', $options: 'i' }
                                }]
                            }
                        })
                    }

                    if (otherOptions.offset) {
                        aggregate.push({
                            $skip: otherOptions.offset
                        })
                    }

                    if (otherOptions.limit) {
                        aggregate.push({
                            $limit: otherOptions.limit
                        })
                    }

                    const userCount = await entityRepository.count(User, {
                        $or: [{
                            parent: user.did
                        }, {
                            did: user.did
                        }]
                    });
                    const accountCount = await entityRepository.count(RelayerAccount, {
                        $or: [{
                            parent: user.did
                        }, {
                            owner: user.did
                        }]
                    });
                    const count = userCount + accountCount;
                    const items = await entityRepository.aggregate(User, aggregate);

                    return new MessageResponse({ items, count });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Get relayer account
         * @param did - DID
         */
        this.getMessages(AuthEvents.GET_RELAYER_ACCOUNT,
            async (msg: {
                relayerAccount: string,
                userId: string | null
            }) => {
                const { relayerAccount, userId } = msg;
                try {
                    const entityRepository = new DatabaseServer();

                    const user = await entityRepository.findOne(User, { hederaAccountId: relayerAccount });
                    if (user) {
                        return new MessageResponse({
                            name: 'Default',
                            account: user.hederaAccountId,
                            owner: user.did,
                            default: true
                        });
                    }
                    const row = await entityRepository.findOne(RelayerAccount, { account: relayerAccount });
                    if (row) {
                        return new MessageResponse({
                            name: row.name,
                            account: row.account,
                            owner: row.owner,
                            default: false
                        });
                    }
                    return new MessageResponse(null);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Relayer account exist
         * @param did - DID
         */
        this.getMessages(AuthEvents.RELAYER_ACCOUNT_EXIST,
            async (msg: {
                did: string,
                relayerAccount: string,
                userId: string | null
            }) => {
                const { did, relayerAccount, userId } = msg;
                try {
                    const entityRepository = new DatabaseServer();
                    const row = await entityRepository.findOne(RelayerAccount, {
                        owner: did,
                        account: relayerAccount
                    });
                    return new MessageResponse(!!row);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });
    }
}
