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
                    return new MessageResponse({
                        balance,
                        unit: 'Hbar',
                    });
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
                    console.debug('GET_CURRENT_WALLET')
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
                        owner: target.did
                    }
                    const key = config.key;

                    const correctAccount = await UserUtils.checkAccount(config.account, config.key);
                    if (!correctAccount) {
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
                    await wallet.setKey(user.walletToken, KeyType.PROJECT_WALLET, `${projectWallet.owner}/${projectWallet.account}`, key);

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
         * @param config - config
         *
         * @returns {any} wallet
         */
        this.getMessages(AuthEvents.GENERATE_PROJECT_WALLET,
            async (msg: {
                user: IAuthUser,
                config: {
                    name?: string
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

                    const account = await UserUtils.generateAccount(target, user.id);
                    const projectWallet = {
                        name: config.name,
                        account: account.id,
                        owner: target.did
                    }
                    const key = account.key;

                    const old = await entityRepository.findOne(ProjectWallet, {
                        account: projectWallet.account,
                        owner: projectWallet.owner
                    });
                    if (old) {
                        return new MessageError('Wallet already exist.');
                    }

                    const wallet = new Wallet();
                    await wallet.setKey(user.walletToken, KeyType.PROJECT_WALLET, `${projectWallet.owner}/${projectWallet.account}`, key);

                    let item = entityRepository.create(ProjectWallet, projectWallet);
                    item = await entityRepository.save(ProjectWallet, item);
                    (item as any).key = key;
                    return new MessageResponse(item);
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                    return new MessageError(error);
                }
            });
    }
}
