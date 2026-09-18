import {
    Injectable,
    OnModuleDestroy,
    OnApplicationBootstrap,
    Logger,
    Optional,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ModuleRef } from '@nestjs/core';
import { Queue, Worker } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import {
    QUEUE_NAMES,
    BASE_QUEUE_NAMES,
    getQueueConfigs,
    getWorkerNetwork,
    envInt,
} from '@shared/config/bullmq.config';

// Processor imports — we inject the live instances so we can access their
// underlying BullMQ Worker (via WorkerHost.worker) and mutate concurrency.
import { TopicSyncProcessor } from '../processors/topic-sync.processor';
import { TopicSyncPriorityProcessor } from '../processors/topic-sync-priority.processor';
import { MessageProcessProcessor } from '../processors/message-process.processor';
import { TokenSyncProcessor } from '../processors/token-sync.processor';
import { IpfsFetchProcessor } from '../processors/ipfs-fetch.processor';
import { MvRefreshProcessor } from '../processors/mv-refresh.processor';
import { BusinessViewBuilderProcessor } from '../processors/business-view-builder.processor';
import { PolicyDecodeProcessor } from '../processors/policy-decode.processor';
import { ProjectReparseProcessor } from '../processors/project-reparse.processor';
import { RetireSyncProcessor } from '../processors/retire-sync.processor';
import { PolicyStatusProcessor } from '../processors/policy-status.processor';

interface ScalingEntry {
    queue: Queue;
    processor: WorkerHost;
    minConcurrency: number;
    maxConcurrency: number;
}

/**
 * In-process concurrency autoscaler for BullMQ workers.
 *
 * Runs a scaling loop every 30 seconds in EVERY worker process, adjusting that
 * process's own BullMQ Worker.concurrency from shared queue depth.
 *
 * Scale-up rule:  backlog > 100  → concurrency += 2 (immediate)
 * Scale-down rule: backlog < 10 AND active < 50% concurrency for 2
 *                  consecutive 30s cycles → concurrency -= 1
 *
 * Deliberately NOT leader-elected. It used to be, which inverted the intent the
 * moment anyone scaled out: `Worker.concurrency` is a property of one process,
 * so a single elected leader could only ever scale its own workers, leaving
 * every other replica pinned at its baseline. Queue depth is shared state and
 * reading it is cheap, so each replica decides for itself.
 *
 * The consequence to size for is that the ceiling is PER REPLICA — N replicas
 * can reach N × maxConcurrency in total. Lower WORKER_MAX_CONCURRENCY_FACTOR
 * (or a per-queue WORKER_<QUEUE>_MAX_CONCURRENCY) when scaling out, so the
 * fleet's combined ceiling still fits Postgres' pool and the mirror-node rate
 * budget.
 *
 * NOTE: This is a smoothing layer only. For sustained load, scale horizontally
 * (more worker containers partitioned via WORKER_QUEUES).
 */
@Injectable()
export class QueueAutoscalerService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(QueueAutoscalerService.name);
    private readonly network = getWorkerNetwork();

    private scalingInterval: ReturnType<typeof setInterval> | null = null;
    private readonly scaleDownCounters: Record<string, number> = {};

    /** Populated in onApplicationBootstrap once all processors have initialised. */
    private readonly scalingTargets = new Map<string, ScalingEntry>();

    constructor(
        // Queues are resolved lazily from the DI container rather than injected:
        // a role-partitioned worker (WORKER_QUEUES) only registers the queues it
        // actually needs, and ten hard @InjectQueue params would force every
        // worker to register — and open a connection to — all ten regardless.
        private readonly moduleRef: ModuleRef,

        // Processor instances — decorated with @Optional() because worker.module.ts
        // only registers processors for active queues. NestJS resolves missing
        // optional providers as undefined rather than throwing.
        @Optional() private readonly topicProcessor: TopicSyncProcessor,
        @Optional() private readonly topicPriorityProcessor: TopicSyncPriorityProcessor,
        @Optional() private readonly messageProcessor: MessageProcessProcessor,
        @Optional() private readonly tokenProcessor: TokenSyncProcessor,
        @Optional() private readonly ipfsProcessor: IpfsFetchProcessor,
        @Optional() private readonly mvProcessor: MvRefreshProcessor,
        @Optional() private readonly bvProcessor: BusinessViewBuilderProcessor,
        @Optional() private readonly pdProcessor: PolicyDecodeProcessor,
        @Optional() private readonly projectReparseProcessor: ProjectReparseProcessor,
        @Optional() private readonly retireProcessor: RetireSyncProcessor,
        @Optional() private readonly policyStatusProcessor: PolicyStatusProcessor,
    ) {}

    /**
     * Runs after all OnModuleInit hooks — at this point every processor's
     * internal BullMQ Worker instance is guaranteed to be initialized.
     */
    onApplicationBootstrap(): void {
        this.buildScalingTargets();

        if (this.scalingTargets.size === 0) {
            this.logger.log('[Autoscaler] No active processors found — disabled');
            return;
        }

        // Every replica scales its own workers — see the class comment.
        this.startScalingLoop();
    }

    onModuleDestroy(): void {
        this.stopScalingLoop();
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    /**
     * Returns the Queue provider for a queue name, or undefined when this
     * worker role does not register it.
     */
    private resolveQueue(queueName: string): Queue | undefined {
        try {
            return this.moduleRef.get<Queue>(getQueueToken(queueName), { strict: false });
        } catch {
            return undefined;
        }
    }

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
            processor: WorkerHost | undefined;
        }> = [
            {
                baseName: BASE_QUEUE_NAMES.TOPIC_SYNC,
                queueName: QUEUE_NAMES.TOPIC_SYNC,
                processor: this.topicProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.TOPIC_SYNC_PRIORITY,
                queueName: QUEUE_NAMES.TOPIC_SYNC_PRIORITY,
                processor: this.topicPriorityProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.MESSAGE_PARSE,
                queueName: QUEUE_NAMES.MESSAGE_PARSE,
                processor: this.messageProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.TOKEN_SYNC,
                queueName: QUEUE_NAMES.TOKEN_SYNC,
                processor: this.tokenProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.IPFS_FETCH,
                queueName: QUEUE_NAMES.IPFS_FETCH,
                processor: this.ipfsProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.MV_REFRESH,
                queueName: QUEUE_NAMES.MV_REFRESH,
                processor: this.mvProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.BUSINESS_VIEW_BUILD,
                queueName: QUEUE_NAMES.BUSINESS_VIEW_BUILD,
                processor: this.bvProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.POLICY_DECODE,
                queueName: QUEUE_NAMES.POLICY_DECODE,
                processor: this.pdProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.PROJECT_REPARSE,
                queueName: QUEUE_NAMES.PROJECT_REPARSE,
                processor: this.projectReparseProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.RETIRE_SYNC,
                queueName: QUEUE_NAMES.RETIRE_SYNC,
                processor: this.retireProcessor,
            },
            {
                baseName: BASE_QUEUE_NAMES.POLICY_STATUS,
                queueName: QUEUE_NAMES.POLICY_STATUS,
                processor: this.policyStatusProcessor,
            },
        ];

        for (const { baseName, queueName, processor } of candidates) {
            if (!processor) continue;

            // Not registered in this worker role — nothing to scale.
            const queue = this.resolveQueue(queueName);
            if (!queue) continue;

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
            // Per-replica ceiling. The factor is configurable because the fleet
            // total is N × this: at one worker the historic 4× is right, but a
            // four-replica ingest tier at 4× would put 16× the baseline against
            // one Postgres pool and one mirror-node rate budget.
            const factor = envInt('WORKER_MAX_CONCURRENCY_FACTOR', 4);
            const maxConcurrency = maxEnv > 0
                ? maxEnv
                : Math.max(baseline * factor, baseline + 4);

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
                // getWaitingCount() counts ONLY the 'wait' list. Any job added
                // with a `priority` goes to the separate 'prioritized' ZSET
                // instead, so a queue whose producers all set a priority reports
                // waiting=0 no matter how deep its backlog is — MESSAGE_PARSE
                // sat at ~1M prioritized jobs while this loop read 0 and tried
                // to scale it DOWN. Both sets are runnable backlog.
                const [wait, prioritized, active] = await Promise.all([
                    entry.queue.getWaitingCount(),
                    entry.queue.getPrioritizedCount(),
                    entry.queue.getActiveCount(),
                ]);
                const waiting = wait + prioritized;

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
}
