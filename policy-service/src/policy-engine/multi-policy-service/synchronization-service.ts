import { IRootConfig, PolicyStatus, WorkerTaskType } from '@guardian/interfaces';
import { CronJob } from 'cron';
import { MintService } from '../mint/mint-service.js';
import { DatabaseServer, MessageAction, MessageServer, MultiPolicyTransaction, NotificationHelper, PinoLogger, Policy, SynchronizationMessage, Token, TopicConfig, Users, Workers } from '@guardian/common';

/**
 * Synchronization Service
 */
export class SynchronizationService {
    /**
     * Cron job
     * @private
     */
    private job: CronJob;
    /**
     * Cron Mask
     * @private
     */
    private readonly cronMask = `0 0 * * *`;
    /**
     * Task Status
     * @private
     */
    private taskStatus: boolean = false;
    /**
     * Users service
     * @private
     */
    private readonly users = new Users();
    /**
     * Policy
     * @private
     */
    private readonly policy: Policy;

    constructor(policy: Policy, private readonly logger: PinoLogger, private readonly policyOwnerId: string | null) {
        this.policy = policy;
    }

    /**
     * Start scheduler
     */
    public start(): boolean {
        if (
            this.policy.status !== PolicyStatus.PUBLISH ||
            !this.policy.synchronizationTopicId
        ) {
            return false;
        }
        if (this.job) {
            return true;
        }
        const cronMask = process.env.MULTI_POLICY_SCHEDULER || this.cronMask;
        this.taskStatus = false;
        this.job = new CronJob(cronMask, () => {
            this.task().then();
        }, null, false, 'UTC');
        this.job.start();
        this.logger.info(`Start synchronization: ${cronMask}`, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE'], this.policyOwnerId);
        return true;
    }

    /**
     * Stop scheduler
     */
    public stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            this.taskStatus = false;
        }
    }

    /**
     * Tick
     * @private
     */
    private async task() {
        try {
            if (this.taskStatus) {
                return;
            }
            await this.logger.info('Start synchronization task', ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE'], this.policyOwnerId);

            this.taskStatus = true;
            await this.taskByPolicy(this.policy, this.policyOwnerId);
            this.taskStatus = false;

            await this.logger.info('Complete synchronization task', ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE'], this.policyOwnerId);
        } catch (error) {
            this.taskStatus = false;
            console.error(error);
            await this.logger.error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE'], this.policyOwnerId);
        }
    }

    /**
     * Group by policy
     * @param policy
     * @param policyOwnerId
     * @private
     */
    private async taskByPolicy(policy: Policy, policyOwnerId: string | null) {
        try {
            const policyOwnerHederaCred = await this.users.getHederaAccount(policy.owner, policyOwnerId);
            const count = await DatabaseServer.countMultiPolicyTransactions(policy.id);

            if (!count) {
                return;
            }

            const topic = new TopicConfig({ topicId: policy.synchronizationTopicId }, null, null);
            const messageServer = new MessageServer({
                operatorId: policyOwnerHederaCred.hederaAccountId,
                operatorKey: policyOwnerHederaCred.hederaAccountKey,
                encryptKey: policyOwnerHederaCred.hederaAccountKey,
                signOptions: policyOwnerHederaCred.signOptions
            }).setTopicObject(topic);

            const workers = new Workers();
            const messages = await workers.addRetryableTask({
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    dryRun: false,
                    topic: policy.synchronizationTopicId,
                    payload: { userId: policyOwnerId },
                }
            }, {
                priority: 10
            });

            const policyMap: { [x: string]: SynchronizationMessage[] } = {};
            const vpMap: { [x: string]: Map<string, SynchronizationMessage> } = {};
            for (const message of messages) {
                try {
                    const synchronizationMessage = SynchronizationMessage.fromMessage(message.message);
                    const user = synchronizationMessage.user;
                    if (synchronizationMessage.action === MessageAction.CreateMultiPolicy) {
                        if (synchronizationMessage.user !== message.payer_account_id) {
                            continue;
                        }
                        if (!policyMap[user]) {
                            policyMap[user] = [];
                        }
                        policyMap[user].push(synchronizationMessage);
                    } else if (synchronizationMessage.action === MessageAction.Mint) {
                        if (synchronizationMessage.policyOwner !== message.payer_account_id) {
                            continue;
                        }
                        if (!vpMap[user]) {
                            vpMap[user] = new Map<string, SynchronizationMessage>();
                        }
                        const amount = parseFloat(synchronizationMessage.amount);
                        if (isFinite(amount) && amount < 1) {
                            vpMap[user].delete(synchronizationMessage.getMessageId());
                        } else {
                            vpMap[user].set(synchronizationMessage.getMessageId(), synchronizationMessage);
                        }
                    }
                } catch (error) {
                    console.log(`${message?.id}: ${error}`);
                }
            }

            const users = Object.keys(policyMap);
            const chunkSize = 10;
            for (let i = 0; i < users.length; i += chunkSize) {
                const chunk = users.slice(i, i + chunkSize);
                const tasks: any[] = [];
                for (const user of chunk) {
                    tasks.push(this.taskByUser(
                        messageServer,
                        policyOwnerHederaCred,
                        policy,
                        user,
                        policyMap[user],
                        vpMap[user],
                        policyOwnerId
                    ));
                }
                await Promise.all<any[][]>(tasks);
            }
        } catch (error) {
            console.error(error);
            await this.logger.error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE'], policyOwnerId);
        }
    }

    /**
     * Group by user
     * @param messageServer
     * @param root
     * @param policy
     * @param user
     * @param policies
     * @param vps
     * @param policyOwnerId
     * @private
     */
    private async taskByUser(
        messageServer: MessageServer,
        root: IRootConfig,
        policy: Policy,
        user: string,
        policies: SynchronizationMessage[],
        vps: Map<string, SynchronizationMessage>,
        policyOwnerId: string | null,
    ) {
        if (!vps) {
            return;
        }
        const vpMap: { [x: string]: SynchronizationMessage[] } = {};
        const vpCountMap: { [x: string]: number } = {};
        const policyOwnerMap: { [x: string]: string } = {};
        for (const p of policies) {
            vpMap[p.policy] = [];
            vpCountMap[p.policy] = 0;
            policyOwnerMap[p.policy] = p.policyOwner;
        }
        for (const vp of vps.values()) {
            const policyId = vp.policy;
            if (vpMap[policyId] && policyOwnerMap[policyId] === vp.policyOwner) {
                vpMap[policyId].push(vp);
                vpCountMap[policyId] += vp.amount;
            }
        }
        let min = Infinity;
        for (const p of policies) {
            min = Math.min(min, vpCountMap[p.policy]);
        }

        const transactions = await DatabaseServer.getMultiPolicyTransactions(policy.id, user);
        for (const transaction of transactions) {
            if (transaction.amount <= min) {
                const users = new Users();
                const userAccount = await users.getUserById(user, policyOwnerId);
                const policyOwner = await users.getUserById(policy.owner, policyOwnerId);
                const notifier = NotificationHelper.init([userAccount?.id, policyOwner?.id]);
                const token = await DatabaseServer.getToken(transaction.tokenId);
                const messageIds = await this.completeTransaction(
                    messageServer,
                    root,
                    token,
                    transaction,
                    policies,
                    vpMap,
                    policyOwnerId,
                    notifier
                );
                if (messageIds) {
                    min -= transaction.amount;
                    MintService.multiMint({
                        root,
                        token,
                        tokenValue: transaction.amount,
                        targetAccount: transaction.target,
                        ids: messageIds,
                        vpMessageId: transaction.vpMessageId,
                        policyId: policy.id?.toString(),
                        userId: policyOwner?.id,
                        owner: transaction.owner,
                        relayerAccount: transaction.relayerAccount,
                        notifier
                    }).catch(error => {
                        this.logger.error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE'], policyOwnerId);
                    });
                }
            }
        }
    }

    /**
     * Complete Transaction
     * @param messageServer
     * @param root
     * @param token
     * @param transaction
     * @param policies
     * @param vpMap
     * @param notifier
     * @param policyOwnerId
     * @private
     */
    private async completeTransaction(
        messageServer: MessageServer,
        root: IRootConfig,
        token: Token,
        transaction: MultiPolicyTransaction,
        policies: SynchronizationMessage[],
        vpMap: { [x: string]: SynchronizationMessage[] },
        policyOwnerId: string | null,
        notifier?: NotificationHelper
    ): Promise<string[] | null> {
        try {
            if (!token) {
                throw new Error('Bad token id');
            }
            const messagesIDs: string[] = [];
            const updateMessages: SynchronizationMessage[] = [];
            for (const p of policies) {
                let amount = transaction.amount;
                let i = 0;
                const count = vpMap[p.policy].length;
                while (i < count && amount > 0) {
                    const m = vpMap[p.policy][i];
                    if (m.amount > 0) {
                        if (amount > m.amount) {
                            updateMessages.push(m);
                            messagesIDs.push(m.messageId);
                            amount -= m.amount;
                            m.amount = 0;
                        } else {
                            updateMessages.push(m);
                            messagesIDs.push(m.messageId);
                            m.amount -= amount;
                            amount = 0;
                        }
                    }
                    i++;
                }
            }
            await this.updateMessages(messageServer, updateMessages, policyOwnerId);

            transaction.status = 'Completed';
            await DatabaseServer.updateMultiPolicyTransactions(transaction);

            return messagesIDs;
        } catch (error) {
            transaction.status = 'Failed';
            console.error(error);
            await this.logger.error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE'], policyOwnerId);
            await DatabaseServer.updateMultiPolicyTransactions(transaction);
            return null;
        }
    }

    /**
     * Update Messages
     * @param messageServer
     * @param updateMessages
     * @param userId
     * @private
     */
    private async updateMessages(
        messageServer: MessageServer,
        updateMessages: SynchronizationMessage[],
        userId?: string | null,
    ): Promise<boolean> {
        for (const message of updateMessages) {
            await messageServer.sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });
        }
        return true;
    }
}
