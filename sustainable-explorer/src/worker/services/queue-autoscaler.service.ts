import {
    Injectable,
    OnModuleDestroy,
    OnApplicationBootstrap,
    Logger,
    Inject,
    Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Worker } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import Redis from 'ioredis';
import {
    QUEUE_NAMES,
    BASE_QUEUE_NAMES,
    getQueueConfigs,
    getWorkerNetwork,
} from '@shared/config/bullmq.config';

// Processor imports — we inject the live instances so we can access their
// underlying BullMQ Worker (via WorkerHost.worker) and mutate concurrency.
import { TopicSyncProcessor } from '../processors/topic-sync.processor';
import { MessageProcessProcessor } from '../processors/message-process.processor';
import { TokenSyncProcessor } from '../processors/token-sync.processor';
import { IpfsFetchProcessor } from '../processors/ipfs-fetch.processor';
import { MvRefreshProcessor } from '../processors/mv-refresh.processor';
import { BusinessViewBuilderProcessor } from '../processors/business-view-builder.processor';
import { PolicyDecodeProcessor } from '../processors/policy-decode.processor';
import { ProjectReparseProcessor } from '../processors/project-reparse.processor';

interface ScalingEntry {
    queue: Queue;
    processor: WorkerHost;
    minConcurrency: number;
    maxConcurrency: number;
}

/**
 * In-process concurrency autoscaler for BullMQ workers.
 *
 * Runs a scaling loop every 30 seconds (leader-elected, scoped per network).
 * Adjusts each processor's BullMQ Worker.concurrency dynamically based on
 * queue depth without restarting the process.
 *
 * Scale-up rule:  waiting > 100  → concurrency += 2 (immediate)
 * Scale-down rule: waiting < 10 AND active < 50% concurrency for 2
 *                  consecutive 30s cycles → concurrency -= 1
 *
 * NOTE: This is a smoothing layer only. For sustained load, scale horizontally
 * (more worker containers partitioned via WORKER_QUEUES).
 *
 * Leader election key: se:autoscaler:leader:{network}
 * (distinct from the scheduler key se:scheduler:leader:{network})
 */
@Injectable()
export class QueueAutoscalerService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(QueueAutoscalerService.name);
    private readonly network = getWorkerNetwork();
    private readonly leaderKey = `se:autoscaler:leader:${this.network}`;
    private readonly instanceId = `autoscaler-${process.pid}-${Date.now()}`;

    private isLeader = false;
    private scalingInterval: ReturnType<typeof setInterval> | null = null;
    private leaderRenewalInterval: ReturnType<typeof setInterval> | null = null;
    private readonly scaleDownCounters: Record<string, number> = {};

    /** Populated in onApplicationBootstrap once all processors have initialised. */
    private readonly scalingTargets = new Map<string, ScalingEntry>();

    constructor(
        // Redict client (same provider as all other workers/schedulers)
        @Inject('REDICT_PUB') private readonly redis: Redis,

        // Queues
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
        @InjectQueue(QUEUE_NAMES.MESSAGE_PARSE) private readonly messageQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
        @InjectQueue(QUEUE_NAMES.MV_REFRESH) private readonly mvQueue: Queue,
        @InjectQueue(QUEUE_NAMES.BUSINESS_VIEW_BUILD) private readonly bvQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_DECODE) private readonly pdQueue: Queue,
        @InjectQueue(QUEUE_NAMES.PROJECT_REPARSE) private readonly projectReparseQueue: Queue,

        // Processor instances — decorated with @Optional() because worker.module.ts
        // only registers processors for active queues. NestJS resolves missing
        // optional providers as undefined rather than throwing.
        @Optional() private readonly topicProcessor: TopicSyncProcessor,
        @Optional() private readonly messageProcessor: MessageProcessProcessor,
        @Optional() private readonly tokenProcessor: TokenSyncProcessor,
        @Optional() private readonly ipfsProcessor: IpfsFetchProcessor,
        @Optional() private readonly mvProcessor: MvRefreshProcessor,
        @Optional() private readonly bvProcessor: BusinessViewBuilderProcessor,
        @Optional() private readonly pdProcessor: PolicyDecodeProcessor,
        @Optional() private readonly projectReparseProcessor: ProjectReparseProcessor,
    ) {}

    /**
     * Runs after all OnModuleInit hooks — at this point every processor's
     * internal BullMQ Worker instance is guaranteed to be initialized.
     */
    async onApplicationBootstrap(): Promise<void> {
        this.buildScalingTargets();

        if (this.scalingTargets.size === 0) {
            this.logger.log('[Autoscaler] No active processors found — disabled');
            return;
        }

        this.isLeader = await this.tryAcquireLeader();

        if (this.isLeader) {
            this.logger.log(`[Autoscaler] Acquired leadership (${this.instanceId})`);
            this.startScalingLoop();
        } else {
            this.logger.log('[Autoscaler] Another instance holds the leader lock — standby');
        }

        // Renew leadership every 15s; take over from a dropped leader
        this.leaderRenewalInterval = setInterval(async () => {
            try {
                const wasLeader = this.isLeader;
                this.isLeader = await this.tryAcquireLeader();

                if (this.isLeader && wasLeader) {
                    await this.redis.expire(this.leaderKey, 30);
                } else if (this.isLeader && !wasLeader) {
                    this.logger.log('[Autoscaler] Took over leadership');
                    for (const key of Object.keys(this.scaleDownCounters)) {
                        this.scaleDownCounters[key] = 0;
                    }
                    this.startScalingLoop();
                } else if (!this.isLeader && wasLeader) {
                    this.logger.warn('[Autoscaler] Lost leadership — pausing scaling loop');
                    this.stopScalingLoop();
                }
            } catch {
                // Silent — retry next interval
            }
        }, 15_000);
    }

    onModuleDestroy(): void {
        this.stopScalingLoop();
        if (this.leaderRenewalInterval) {
            clearInterval(this.leaderRenewalInterval);
            this.leaderRenewalInterval = null;
        }
        if (this.isLeader) {
            this.redis.del(this.leaderKey).catch(() => {});
        }
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    /**
     * Builds the scaling targets map from processors that are actually
     * registered in this worker instance.
     *
     * NestJS only creates providers for active queues, so an inactive
     * processor will not be injectable. We rely on optional injection
     * (processors may be undefined) and guard with a try/catch on
     * WorkerHost.worker which throws if the BullMQ Worker is not ready.
     */
    private buildScalingTargets(): void {
        const configs = getQueueConfigs();
        const configMap = new Map(configs.map(c => [c.name, c]));

        const candidates: Array<{
            baseName: string;
            queueName: string;
            queue: Queue;
            processor: WorkerHost | undefined;
        }> = [
            {
                baseName: BASE_QUEUE_NAMES.TOPIC_SYNC,
                queueName: QUEUE_NAMES.TOPIC_SYNC,
                queue: this.topicQueue,
                processor: this.topicProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.MESSAGE_PARSE,
                queueName: QUEUE_NAMES.MESSAGE_PARSE,
                queue: this.messageQueue,
                processor: this.messageProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.TOKEN_SYNC,
                queueName: QUEUE_NAMES.TOKEN_SYNC,
                queue: this.tokenQueue,
                processor: this.tokenProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.IPFS_FETCH,
                queueName: QUEUE_NAMES.IPFS_FETCH,
                queue: this.ipfsQueue,
                processor: this.ipfsProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.MV_REFRESH,
                queueName: QUEUE_NAMES.MV_REFRESH,
                queue: this.mvQueue,
                processor: this.mvProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.BUSINESS_VIEW_BUILD,
                queueName: QUEUE_NAMES.BUSINESS_VIEW_BUILD,
                queue: this.bvQueue,
                processor: this.bvProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.POLICY_DECODE,
                queueName: QUEUE_NAMES.POLICY_DECODE,
                queue: this.pdQueue,
                processor: this.pdProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.PROJECT_REPARSE,
                queueName: QUEUE_NAMES.PROJECT_REPARSE,
                queue: this.projectReparseQueue,
                processor: this.projectReparseProcessor,
            },
        ];

        for (const { baseName, queueName, queue, processor } of candidates) {
            if (!processor) continue;

            // Verify the underlying BullMQ Worker is accessible
            try {
                void processor.worker; // throws if not initialized
            } catch {
                // Processor not active in this worker instance
                continue;
            }

            const queueConfig = configMap.get(queueName);
            if (!queueConfig) continue;

            const baseline = queueConfig.concurrency;

            // Allow per-queue max concurrency override via env var.
            // ENV key pattern: WORKER_MIRROR_NODE_TOPICS_MAX_CONCURRENCY
            const envKey = baseName.replace(/-/g, '_').toUpperCase();
            const maxEnv = parseInt(
                process.env[`WORKER_${envKey}_MAX_CONCURRENCY`] || '0',
                10,
            );
            const maxConcurrency = maxEnv > 0
                ? maxEnv
                : Math.max(baseline * 4, baseline + 4);

            this.scalingTargets.set(baseName, {
                queue,
                processor,
                minConcurrency: baseline,
                maxConcurrency,
            });
        }

        this.logger.log(
            `[Autoscaler] Tracking ${this.scalingTargets.size} processor(s): ` +
            Array.from(this.scalingTargets.keys()).join(', '),
        );
    }

    private startScalingLoop(): void {
        if (this.scalingInterval) return; // Already running
        this.scalingInterval = setInterval(() => {
            void this.runScalingCycle();
        }, 30_000);
        this.logger.log('[Autoscaler] Scaling loop started (30s interval)');
    }

    private stopScalingLoop(): void {
        if (this.scalingInterval) {
            clearInterval(this.scalingInterval);
            this.scalingInterval = null;
        }
    }

    private async runScalingCycle(): Promise<void> {
        for (const [baseName, entry] of this.scalingTargets.entries()) {
            try {
                const waiting = await entry.queue.getWaitingCount();
                const active = await entry.queue.getActiveCount();

                // BullMQ Worker.concurrency is a proper get/set property (verified
                // in node_modules/bullmq/dist/cjs/classes/worker.js lines 214-224).
                const workerInstance = entry.processor.worker as Worker;
                const current: number = workerInstance.concurrency ?? entry.minConcurrency;

                if (waiting > 100 && current < entry.maxConcurrency) {
                    const next = Math.min(current + 2, entry.maxConcurrency);
                    workerInstance.concurrency = next;
                    this.logger.log(
                        `[Autoscaler] Scale UP ${baseName}: ${current} → ${next} (waiting=${waiting})`,
                    );
                    this.scaleDownCounters[baseName] = 0;
                } else if (waiting < 10 && active < current / 2) {
                    this.scaleDownCounters[baseName] =
                        (this.scaleDownCounters[baseName] ?? 0) + 1;
                    if (this.scaleDownCounters[baseName] >= 2) {
                        const next = Math.max(current - 1, entry.minConcurrency);
                        if (next < current) {
                            workerInstance.concurrency = next;
                            this.logger.log(
                                `[Autoscaler] Scale DOWN ${baseName}: ${current} → ${next}`,
                            );
                        }
                        this.scaleDownCounters[baseName] = 0;
                    }
                } else {
                    this.scaleDownCounters[baseName] = 0;
                }
            } catch (err) {
                this.logger.warn(
                    `[Autoscaler] Error scaling ${baseName}: ${(err as Error).message}`,
                );
            }
        }
    }

    /**
     * Acquires or verifies the distributed leader lock in Redict.
     * TTL: 30s. Renewed every 15s by the leader.
     */
    private async tryAcquireLeader(): Promise<boolean> {
        const result = await this.redis.set(
            this.leaderKey,
            this.instanceId,
            'EX', 30,
            'NX',
        );
        if (result === 'OK') return true;

        const current = await this.redis.get(this.leaderKey);
        return current === this.instanceId;
    }
}
