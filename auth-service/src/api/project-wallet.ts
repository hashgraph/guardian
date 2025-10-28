import { DatabaseServer, IAuthUser, KeyType, MessageError, MessageResponse, NatsService, PinoLogger, Singleton, Wallet, Workers } from '@guardian/common';
import { AuthEvents, GenerateUUIDv4, IGroup, IOwner, PermissionsArray, WorkerTaskType } from '@guardian/interfaces';
import { ProjectWallet } from '../entity/project-wallet.js';
import { User } from '../entity/user.js';
import { UserProp, UserUtils } from '#utils';

/**
 * Project wallet service
 */
@Singleton
export class ProjectWalletService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'auth-wallets-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'auth-wallets-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listeners
     */
    registerListeners(logger: PinoLogger): void {
        /**
         * Get project wallet balance
         * @param user - user
         *
         * @returns {any[]} wallets
         */
        this.getMessages(AuthEvents.GET_PROJECT_WALLET_BALANCE,
            async (msg: {
                user: IAuthUser,
                account: string
            }) => {
                try {
                    const { user, account } = msg;

                    const entityRepository = new DatabaseServer();
                    const target = await entityRepository.findOne(User, {
                        did: user.did
                    });
                    if (!target && target.did) {
                        return new MessageError('User does not exist.');
                    }

                    let wallet: any;
                    if (!account) {
                        return new MessageError('Wallet does not exist.');
                    }
                    if (account === user.hederaAccountId) {
                        wallet = { account };
                    } else {
                        wallet = await entityRepository.findOne(ProjectWallet, { account, owner: user.did });
                    }
                    if (!wallet) {
                        return new MessageError('Wallet does not exist.');
                    }

                    const workers = new Workers();
                    const balance = await workers.addNonRetryableTask({
                        type: WorkerTaskType.GET_USER_BALANCE_REST,
                        data: {
                            hederaAccountId: wallet.account
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
         * Get current wallet
         * @param user - user
         *
         * @returns {any} wallet
         */
        this.getMessages(AuthEvents.GET_CURRENT_WALLET,
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
         * Get project wallets
         * @param user - user
         *
         * @returns {any[]} wallets
         */
        this.getMessages(AuthEvents.GET_PROJECT_WALLETS,
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
                        query.name = { $regex: '.*' + search + '.*' }
                    }

                    const wallets = await entityRepository.find(ProjectWallet, query, otherOptions);

                    return new MessageResponse(wallets);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Get project wallets
         * @param user - user
         *
         * @returns {any[]} wallets
         */
        this.getMessages(AuthEvents.GET_PROJECT_WALLETS_ALL,
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

                    const wallets = await entityRepository.find(ProjectWallet, {
                        owner: user.did
                    });

                    return new MessageResponse(wallets);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Create project wallet
         * @param user - user
         * @param config - config
         *
         * @returns {any} wallet
         */
        this.getMessages(AuthEvents.CREATE_PROJECT_WALLET,
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

                    const projectWallet = {
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

                    const old = await entityRepository.findOne(ProjectWallet, {
                        account: projectWallet.account,
                        owner: projectWallet.owner
                    });
                    if (old) {
                        return new MessageError('Wallet already exist.');
                    }

                    const wallet = new Wallet();
                    const userFull = await entityRepository.findOne(User, { did: user.did });
                    await wallet.setKey(userFull.walletToken, KeyType.PROJECT_WALLET, `${projectWallet.owner}/${projectWallet.account}`, key);

                    let item = entityRepository.create(ProjectWallet, projectWallet);
                    item = await entityRepository.save(ProjectWallet, item);

                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });


        /**
         * Generate project wallet
         * @param user - user
         *
         * @returns {any} account
         */
        this.getMessages(AuthEvents.GENERATE_PROJECT_WALLET,
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
         * Get user wallet
         * @param did - DID
         */
        this.getMessages(AuthEvents.GET_USER_WALLET,
            async (msg: {
                did: string,
                wallet: string,
                userId: string | null
            }) => {
                const { did, wallet, userId } = msg;
                try {
                    const entityRepository = new DatabaseServer();
                    if (wallet) {
                        const projectWallet = await entityRepository.findOne(ProjectWallet, {
                            account: wallet,
                            owner: did
                        });
                        if (projectWallet) {
                            return new MessageResponse({
                                account: projectWallet.account,
                                name: projectWallet.name,
                                default: false
                            });
                        }
                    }
                    const user = await entityRepository.findOne(User, { did });
                    if (!wallet || wallet === user.hederaAccountId) {
                        return new MessageResponse({
                            name: 'Default',
                            account: user.hederaAccountId,
                            default: true
                        });
                    }
                    return new MessageError('Wallet not found.');
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get project wallets
         * @param user - user
         *
         * @returns {any[]} wallets
         */
        this.getMessages(AuthEvents.GET_USER_WALLETS,
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
                            from: "project_wallet",
                            localField: "did",
                            foreignField: "owner",
                            as: "wallets"
                        }
                    }, {
                        $project: {
                            username: "$username",
                            did: "$did",
                            parent: "$parent",
                            hederaAccountId: "$hederaAccountId",
                            wallets: {
                                $concatArrays: [[null], "$wallets"]
                            }
                        }
                    }, {
                        $unwind: {
                            path: "$wallets",
                            preserveNullAndEmptyArrays: true
                        }
                    }, {
                        $project: {
                            username: "$username",
                            did: "$did",
                            parent: "$parent",
                            hederaAccountId: "$hederaAccountId",
                            walletAccountId: "$wallets.account",
                            walletName: "$wallets.name"
                        }
                    }];

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

                    if (search) {
                        aggregate.push({
                            $match: {
                                $or: [{
                                    username: { $regex: '.*' + search + '.*' },
                                }, {
                                    walletName: { $regex: '.*' + search + '.*' }
                                }]
                            }
                        })
                    }

                    // console.debug(JSON.stringify(aggregate, null, 4))

                    const wallets = await entityRepository.aggregate(User, aggregate);

                    return new MessageResponse(wallets);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });

        /**
         * Get user wallet
         * @param did - DID
         */
        this.getMessages(AuthEvents.GET_WALLET,
            async (msg: {
                wallet: string,
                userId: string | null
            }) => {
                const { wallet, userId } = msg;
                try {
                    const entityRepository = new DatabaseServer();

                    const user = await entityRepository.findOne(User, { hederaAccountId: wallet });
                    if (user) {
                        return new MessageResponse({
                            name: 'Default',
                            account: user.hederaAccountId,
                            owner: user.did,
                            default: true
                        });
                    }
                    const projectWallet = await entityRepository.findOne(ProjectWallet, { account: wallet });
                    if (projectWallet) {
                        return new MessageResponse({
                            name: projectWallet.name,
                            account: projectWallet.account,
                            owner: projectWallet.owner,
                            default: false
                        });
                    }
                    return new MessageResponse(null);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });
    }
}
