import {
    IRootConfig,
    PolicyType,
    WorkerTaskType
} from '@guardian/interfaces';
import { CronJob } from 'cron';
import { MintService } from './mint-service';
import {
    Logger,
    Policy,
    Token,
    MultiPolicyTransaction,
    DatabaseServer,
    Users,
    Workers,
    MessageAction,
    MessageServer,
    SynchronizationMessage,
    TopicConfig,
} from '@guardian/common';

/**
 * Synchronization Service
 */
export class SynchronizationService {
    /**
     * Cron job
     * @private
     */
    private static job: CronJob;
    /**
     * Cron Mask
     * @private
     */
    private static readonly cronMask = `0 0 * * *`;
    /**
     * Task Status
     * @private
     */
    private static taskStatus: boolean = false;
    /**
     * Users service
     * @private
     */
    private static readonly users = new Users();

    /**
     * Start scheduler
     */
    public static start() {
        if (SynchronizationService.job) {
            return;
        }
        const cronMask = process.env.MULTI_POLICY_SCHEDULER || SynchronizationService.cronMask;
        SynchronizationService.taskStatus = false;
        SynchronizationService.job = new CronJob(cronMask, () => {
            SynchronizationService.task().then();
        }, null, false, 'UTC');
        SynchronizationService.job.start();
        new Logger().info(`Start synchronization: ${cronMask}`, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
    }

    /**
     * Stop scheduler
     */
    public static stop() {
        if (SynchronizationService.job) {
            SynchronizationService.job.stop();
            SynchronizationService.job = null;
            SynchronizationService.taskStatus = false;
        }
    }

    /**
     * Tick
     * @private
     */
    private static async task() {
        try {
            if (SynchronizationService.taskStatus) {
                return;
            }
            new Logger().info('Start synchronization task', ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);

            SynchronizationService.taskStatus = true;

            const policies = await DatabaseServer.getPolicies({
                where: {
                    status: PolicyType.PUBLISH,
                    synchronizationTopicId: { $exists: true }
                }
            }, {
                fields: ['id', 'owner', 'instanceTopicId', 'synchronizationTopicId']
            });

            const tasks: any[] = [];
            for (const policy of policies) {
                tasks.push(SynchronizationService.taskByPolicy(policy));
            }
            await Promise.all<any[][]>(tasks);

            SynchronizationService.taskStatus = false;

            new Logger().info('Complete synchronization task', ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
        } catch (error) {
            SynchronizationService.taskStatus = false;
            console.error(error);
            new Logger().error(error, ['GUARDIAN_SERVICE', 'SYNCHRONIZATION_SERVICE']);
        }
    }

    /**
     * Group by policy
     * @param policy
     * @private
     */
    private static async taskByPolicy(policy: Policy) {
        try {
            const root = await SynchronizationService.users.getHederaAccount(policy.owner);
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
            const tasks: any[] = [];
            for (const user of users) {
                tasks.push(SynchronizationService.taskByUser(
                    messageServer, root, policy, user, policyMap[user], vpMap[user])
                );
            }
            await Promise.all<any[][]>(tasks);
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
    private static async taskByUser(
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
                const status = await SynchronizationService.completeTransaction(
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
    private static async completeTransaction(
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
            await SynchronizationService.updateMessages(messageServer, updateMessages);
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
    private static async updateMessages(
        messageServer: MessageServer,
        updateMessages: SynchronizationMessage[]
    ): Promise<boolean> {
        for (const message of updateMessages) {
            await messageServer.sendMessage(message);
        }
        return true;
    }
}
