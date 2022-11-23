import { Token } from '@entity/token';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import {
    ExternalMessageEvents,
    IRootConfig,
    PolicyType,
    WorkerTaskType
} from '@guardian/interfaces';
import { ExternalEventChannel } from '@guardian/common';
import { PrivateKey } from '@hashgraph/sdk';
import { KeyType, Wallet } from '@helpers/wallet';
import { Workers } from '@helpers/workers';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { DatabaseServer } from '@database-modules';
import { MultiPolicy } from '@entity/multi-policy';
import { MessageAction, MessageServer, SynchronizationMessage, TopicConfig, VcDocument } from '@hedera-modules';
import { CronJob } from 'cron';
import { Policy } from '@entity/policy';
import { MintService } from './mint-service';
import { Users } from '@helpers/users';


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
    private static readonly cronMask = `* * * * *`;
    /**
     * Task Status
     * @private
     */
    private static taskStatus: boolean = false;
    /**
     * Users service
     * @private
     */
    private static users = new Users();

    public static start() {
        SynchronizationService.task().then();
        return;

        if (SynchronizationService.job) {
            return;
        }
        SynchronizationService.taskStatus = false;
        SynchronizationService.job = new CronJob(SynchronizationService.cronMask, () => {
            SynchronizationService.task().then();
        }, null, false, 'UTC');
    }

    public static stop() {
        if (SynchronizationService.job) {
            SynchronizationService.job.stop();
            SynchronizationService.job = null;
            SynchronizationService.taskStatus = false;
        }
    }

    private static async task() {
        try {
            if (SynchronizationService.taskStatus) {
                return;
            }
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
        } catch (error) {
            SynchronizationService.taskStatus = false;
            console.log(error);
        }
    }

    private static async taskByPolicy(policy: Policy) {
        try {
            const workers = new Workers();
            const messages = await workers.addRetryableTask({
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    operatorId: null,
                    operatorKey: null,
                    dryRun: false,
                    topic: policy.synchronizationTopicId
                }
            }, 1);

            const policyMap: any = {};
            const vpMap: any = {};
            for (const message of messages) {
                try {
                    const synchronizationMessage = SynchronizationMessage.fromMessage(message.message);
                    const user = synchronizationMessage.user;
                    if (synchronizationMessage.action === MessageAction.CreateMultiPolicy) {
                        if (!policyMap[user]) {
                            policyMap[user] = [];
                        }
                        policyMap[user].push(synchronizationMessage);
                    } else if (synchronizationMessage.action === MessageAction.Mint) {
                        if (!vpMap[user]) {
                            vpMap[user] = [];
                        }
                        vpMap[user].push(synchronizationMessage);
                    }
                } catch (error) {
                    console.log(error);
                }
            }

            const users = Object.keys(policyMap);
            const tasks: any[] = [];
            for (const user of users) {
                tasks.push(SynchronizationService.taskByUser(policy, user, policyMap[user], vpMap[user]));
            }
            await Promise.all<any[][]>(tasks);
        } catch (error) {
            console.log(error);
        }
    }

    private static async taskByUser(
        policy: Policy,
        user: string,
        policies: SynchronizationMessage[],
        vps: SynchronizationMessage[]
    ) {
        const transactions = await DatabaseServer.getMultiPolicyTransactions(policy.id, user);
        const root = await SynchronizationService.users.getHederaAccount(policy.owner);
        const vpMap = new Map<string, any>();
        for (const vp of vps) {
            if (vpMap.has(vp.hash)) {
                vpMap.get(vp.hash)[vp.policy] = vp;
            } else {
                const m: any = {};
                m[vp.policy] = vp;
                vpMap.set(vp.hash, m);
            }
        }

        for (const transaction of transactions) {
            const item = vpMap.get(transaction.hash);
            const messagesIDs = SynchronizationService.getConfig(item, policies);
            if (messagesIDs) {
                const token = await DatabaseServer.getTokenById(transaction.tokenId);
                if (!token) {
                    throw new Error('Bad token id');
                }
                console.log('!!!!!!   ', root);
                console.log('!!!!!!   ', token);
                console.log('!!!!!!   ', transaction);
                await MintService.multiMint(
                    root,
                    token,
                    transaction.amount,
                    transaction.target,
                    messagesIDs
                );
                transaction.status = 'Completed';
                await DatabaseServer.updateMultiPolicyTransactions(transaction);
            }
        }
    }

    private static getConfig(map: any, policies: SynchronizationMessage[]) {
        const messagesIDs: string[] = []
        for (const p of policies) {
            if (!map[p.policy]) {
                return null;
            }
            messagesIDs.push(map[p.policy].messageId);
        }
        return messagesIDs;
    }
}