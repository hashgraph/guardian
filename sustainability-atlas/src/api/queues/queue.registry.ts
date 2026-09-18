import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {
    BASE_QUEUE_NAMES,
    getEventStreamOptions,
    getQueueConfigs,
    QueueDefinition,
} from '@shared/config/bullmq.config';
import { getConfiguredNetworks } from '@shared/config/database.config';
import { getRedictConfig } from '@shared/config/redict.config';

/**
 * Manages one BullMQ Queue + QueueEvents pair per (network × base-queue-name)
 * combination. Used exclusively by the API process — does NOT use @InjectQueue
 * because the worker module is not imported here.
 *
 * Map key: `${network}:${baseQueueName}` (e.g. "testnet:mirror-node-topics")
 */
@Injectable()
export class QueueRegistry implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(QueueRegistry.name);
    private readonly queues = new Map<string, Queue>();
    private readonly queueEvents = new Map<string, QueueEvents>();
    /** One non-blocking client shared by every Queue — see onModuleInit. */
    private sharedConnection!: Redis;
    private readonly networks: string[];
    private readonly baseNames: string[];

    constructor() {
        this.networks = getConfiguredNetworks();
        this.baseNames = Object.values(BASE_QUEUE_NAMES);
    }

    async onModuleInit(): Promise<void> {
        // Strip keyPrefix — BullMQ manages its own key namespace ('bull:{name}:...').
        // The worker's BullModule.forRootAsync also omits keyPrefix for the same reason.
        // Passing keyPrefix would redirect all reads to a non-existent namespace.
        const { keyPrefix: _kp, ...connection } = getRedictConfig();

        // ONE client shared by every Queue instead of one per queue. Queue work
        // here is ordinary request/response (counts, getJob, add) — none of it
        // blocking — so a single socket serves all of them, and BullMQ flags a
        // caller-supplied ioredis instance as `shared` so queue.close() will not
        // disconnect it out from under its siblings.
        this.sharedConnection = new Redis(connection);
        this.sharedConnection.on('error', (error: Error) => {
            this.logger.warn(`Shared queue connection error: ${error.message}`);
        });

        for (const network of this.networks) {
            for (const base of this.baseNames) {
                // Build the full queue name directly — same logic as qname() but
                // without the type constraint that requires a BaseQueueName literal.
                const fullName = `${base}-${network}`;
                const mapKey = this.key(network, base);

                try {
                    // Carry the same default job options the worker uses. Without
                    // them every job the API enqueues (topic requeue, IPFS
                    // retry-by-topic, mass reparse) is retained in Redict forever
                    // and never retries — the admin path was the one producer
                    // still reintroducing the Redict-OOM growth.
                    const config = this.getQueueConfig(network, base);
                    const queue = new Queue(fullName, {
                        connection: this.sharedConnection,
                        defaultJobOptions: config?.defaultJobOptions,
                        streams: getEventStreamOptions(),
                    });

                    this.queues.set(mapKey, queue);

                    this.logger.log(`Registered queue "${fullName}" [key=${mapKey}]`);
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Failed to register queue "${fullName}": ${msg}`);
                }
            }
        }

        // QueueEvents are deliberately NOT created here — see acquireEventsForNetwork.
    }

    async onModuleDestroy(): Promise<void> {
        const closeAll = async (label: string, map: Map<string, { close(): Promise<void> }>) => {
            for (const [k, instance] of map.entries()) {
                try {
                    await instance.close();
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error);
                    this.logger.warn(`Error closing ${label} "${k}": ${msg}`);
                }
            }
            map.clear();
        };

        await closeAll('Queue', this.queues as Map<string, { close(): Promise<void> }>);
        await closeAll('QueueEvents', this.queueEvents as Map<string, { close(): Promise<void> }>);

        // Owned by this class, so it has to be closed explicitly — BullMQ leaves
        // a shared connection alone.
        try {
            this.sharedConnection?.disconnect();
        } catch {
            // Already gone — nothing to do.
        }
    }

    // ---------------------------------------------------------------------------
    // QueueEvents (created on demand)
    // ---------------------------------------------------------------------------

    /**
     * Opens the QueueEvents streams for one network, creating any that are
     * missing, and returns them alongside their queues.
     *
     * Each QueueEvents holds its own connection parked on a blocking XREAD for
     * the life of the process. Creating them for every network x queue at boot
     * meant the API opened dozens of permanently-blocked clients whether or not
     * a single dashboard was watching — most of a 0.5-CPU Redict's client budget
     * spent on streams nobody read. They are now opened when a subscriber
     * actually arrives and closed again when the last one leaves.
     */
    acquireEventsForNetwork(
        network: string,
    ): Array<{ network: string; baseName: string; queue: Queue; events: QueueEvents }> {
        const { keyPrefix: _kp, ...connection } = getRedictConfig();
        const result: Array<{ network: string; baseName: string; queue: Queue; events: QueueEvents }> = [];

        for (const base of this.baseNames) {
            const mapKey = this.key(network, base);
            const queue = this.queues.get(mapKey);
            if (!queue) continue;

            let events = this.queueEvents.get(mapKey);
            if (!events) {
                try {
                    // Options, not the shared instance: a QueueEvents connection
                    // blocks on XREAD and cannot be shared with anything else.
                    events = new QueueEvents(`${base}-${network}`, { connection });
                    this.queueEvents.set(mapKey, events);
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Failed to open QueueEvents for "${mapKey}": ${msg}`);
                    continue;
                }
            }
            result.push({ network, baseName: base, queue, events });
        }
        return result;
    }

    /** Closes and forgets every QueueEvents stream for one network. */
    async releaseEventsForNetwork(network: string): Promise<void> {
        for (const base of this.baseNames) {
            const mapKey = this.key(network, base);
            const events = this.queueEvents.get(mapKey);
            if (!events) continue;
            this.queueEvents.delete(mapKey);
            try {
                await events.close();
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Error closing QueueEvents "${mapKey}": ${msg}`);
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Public accessors
    // ---------------------------------------------------------------------------

    /**
     * Returns the Queue for the given (network, baseName) pair.
     * Throws NotFoundException if neither the network nor the base name is known.
     */
    getQueue(network: string, baseName: string): Queue {
        const q = this.queues.get(this.key(network, baseName));
        if (!q) {
            throw new NotFoundException(
                `Queue not found: network="${network}", baseName="${baseName}". ` +
                `Available networks: ${this.networks.join(', ')}. ` +
                `Available base names: ${this.baseNames.join(', ')}.`,
            );
        }
        return q;
    }


    /** The shared queue connection, for health and diagnostic reads. */
    getConnection(): Redis {
        return this.sharedConnection;
    }

    /** Returns all base queue name strings (without network suffix). */
    listBaseNames(): string[] {
        return [...this.baseNames];
    }

    /** Returns all configured network names. */
    getConfiguredNetworks(): string[] {
        return [...this.networks];
    }

    /**
     * Returns the static QueueDefinition config for a given base queue name,
     * or undefined if not found.
     *
     * Note: getQueueConfigs() builds names using the worker's current HEDERA_NET
     * env var.  We match by stripping the network suffix so this works correctly
     * in the API process regardless of which HEDERA_NET is set.
     */
    getQueueConfig(_network: string, baseName: string): QueueDefinition | undefined {
        return getQueueConfigs().find((c) => this.extractBase(c.name) === baseName) as
            | QueueDefinition
            | undefined;
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private key(network: string, baseName: string): string {
        return `${network.toLowerCase()}:${baseName}`;
    }

    /**
     * Strips the last dash-separated segment (the network suffix) from a full
     * queue name to recover the base name.
     * e.g. "mirror-node-topics-testnet" → "mirror-node-topics"
     */
    private extractBase(fullName: string): string {
        const parts = fullName.split('-');
        // The network suffix is always the last segment.
        return parts.slice(0, -1).join('-');
    }
}
