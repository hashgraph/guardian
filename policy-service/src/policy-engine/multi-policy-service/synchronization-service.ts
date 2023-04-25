import {
    IRootConfig,
    PolicyType,
    WorkerTaskType
} from '@guardian/interfaces';
import { CronJob } from 'cron';
import { MintService } from './mint-service';
import {
    Logger,
    Token,
    DatabaseServer,
    MultiPolicyTransaction,
    Policy,
    Users,
    MessageAction,
    MessageServer,
    SynchronizationMessage,
    TopicConfig,
    Workers,
} from '@guardian/common';

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

    constructor(policy: Policy) {
        this.policy = policy;
    }

    /**
     * Start scheduler
     */
    public start(): boolean {
        if (
            this.policy.status !== PolicyType.PUBLISH ||
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
        new Logger().info(`Start synchronization: ${cronMask}`, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
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
            new Logger().info('Start synchronization task', ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);

            this.taskStatus = true;
            await this.taskByPolicy(this.policy);
            this.taskStatus = false;

            new Logger().info('Complete synchronization task', ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
        } catch (error) {
            this.taskStatus = false;
            console.error(error);
            new Logger().error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
        }
    }

    /**
     * Group by policy
     * @param policy
     * @private
     */
    private async taskByPolicy(policy: Policy) {
        try {
            const root = await this.users.getHederaAccount(policy.owner);
            const count = await DatabaseServer.countMultiPolicyTransactions(policy.id);

            if (!count) {
                return;
            }

            const topic = new TopicConfig({ topicId: policy.synchronizationTopicId }, null, null);
            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey).setTopicObject(topic);

            const workers = new Workers();
            const messages = await workers.addRetryableTask({
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    operatorId: null,
                    operatorKey: null,
                    dryRun: false,
                    topic: policy.synchronizationTopicId
                }
            }, 10);

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
                    tasks.push(this.taskByUser(messageServer, root, policy, user, policyMap[user], vpMap[user]));
                }
                await Promise.all<any[][]>(tasks);
            }
        } catch (error) {
            console.error(error);
            new Logger().error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
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
     * @private
     */
    private async taskByUser(
        messageServer: MessageServer,
        root: IRootConfig,
        policy: Policy,
        user: string,
        policies: SynchronizationMessage[],
        vps: Map<string, SynchronizationMessage>
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
                const token = await DatabaseServer.getToken(transaction.tokenId);
                const status = await this.completeTransaction(
                    messageServer, root, token, transaction, policies, vpMap
                );
                if (status) {
                    min -= transaction.amount;
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
     * @private
     */
    private async completeTransaction(
        messageServer: MessageServer,
        root: IRootConfig,
        token: Token,
        transaction: MultiPolicyTransaction,
        policies: SynchronizationMessage[],
        vpMap: { [x: string]: SynchronizationMessage[] }
    ): Promise<boolean> {
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
            await this.updateMessages(messageServer, updateMessages);
            await MintService.multiMint(
                root,
                token,
                transaction.amount,
                transaction.target,
                messagesIDs
            );
            transaction.status = 'Completed';
            await DatabaseServer.updateMultiPolicyTransactions(transaction);
            return true;
        } catch (error) {
            transaction.status = 'Failed';
            console.error(error);
            new Logger().error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
            await DatabaseServer.updateMultiPolicyTransactions(transaction);
            return false;
        }
    }

    /**
     * Update Messages
     * @param messageServer
     * @param updateMessages
     * @private
     */
    private async updateMessages(
        messageServer: MessageServer,
        updateMessages: SynchronizationMessage[]
    ): Promise<boolean> {
        for (const message of updateMessages) {
            await messageServer.sendMessage(message);
        }
        return true;
    }
}
