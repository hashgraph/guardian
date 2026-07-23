import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import {
    BASE_QUEUE_NAMES,
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

        for (const network of this.networks) {
            for (const base of this.baseNames) {
                // Build the full queue name directly — same logic as qname() but
                // without the type constraint that requires a BaseQueueName literal.
                const fullName = `${base}-${network}`;
                const mapKey = this.key(network, base);

                try {
                    const queue = new Queue(fullName, { connection });
                    const events = new QueueEvents(fullName, { connection });

                    this.queues.set(mapKey, queue);
                    this.queueEvents.set(mapKey, events);

                    this.logger.log(`Registered queue "${fullName}" [key=${mapKey}]`);
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Failed to register queue "${fullName}": ${msg}`);
                }
            }
        }
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

    /**
     * Returns the QueueEvents instance for the given (network, baseName) pair.
     * Throws NotFoundException if not found.
     */
    getQueueEvents(network: string, baseName: string): QueueEvents {
        const qe = this.queueEvents.get(this.key(network, baseName));
        if (!qe) {
            throw new NotFoundException(
                `QueueEvents not found: network="${network}", baseName="${baseName}".`,
            );
        }
        return qe;
    }

    /**
     * Returns all (network, baseName) pairs as an iterable.
     * Useful for the QueueEventsBus to wire up listeners.
     */
    getAllEntries(): Array<{ network: string; baseName: string; queue: Queue; events: QueueEvents }> {
        const result: Array<{ network: string; baseName: string; queue: Queue; events: QueueEvents }> = [];
        for (const network of this.networks) {
            for (const base of this.baseNames) {
                const q = this.queues.get(this.key(network, base));
                const e = this.queueEvents.get(this.key(network, base));
                if (q && e) {
                    result.push({ network, baseName: base, queue: q, events: e });
                }
            }
        }
        return result;
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
