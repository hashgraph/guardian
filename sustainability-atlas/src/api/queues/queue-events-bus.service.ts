import { Injectable, Logger, OnModuleInit, OnModuleDestroy, MessageEvent } from '@nestjs/common';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { Observable, fromEvent, interval, merge } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { QueueRegistry } from './queue.registry';
import { getRedictConfig } from '@shared/config/redict.config';

// ---------------------------------------------------------------------------
// Internal event shape emitted on the EventEmitter
// ---------------------------------------------------------------------------

interface QueueBusEvent {
    network: string;
    queueBase: string;
    type: string;
    [key: string]: unknown;
}

const BUS_EVENT = 'queue-bus-event';
const SE_CHANNEL = 'se:events';
const HEARTBEAT_INTERVAL_MS = 25_000;
const COUNTS_DEBOUNCE_MS = 500;

/**
 * Fans out BullMQ QueueEvents + Redis pub/sub messages to per-network
 * SSE Observable streams.
 *
 * Uses Node's built-in EventEmitter (EventEmitter2 is not a project dependency)
 * plus RxJS fromEvent / interval / merge.
 */
@Injectable()
export class QueueEventsBus implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(QueueEventsBus.name);
    private readonly emitter = new EventEmitter();

    /** Subscriber connection — dedicated, cannot issue other commands. */
    private subscriber!: Redis;

    /** Debounce timers keyed by "${network}:${queueBase}" */
    private readonly countTimers = new Map<string, ReturnType<typeof setTimeout>>();

    constructor(private readonly registry: QueueRegistry) {
        // Increase max listeners to avoid Node warnings when many SSE clients connect.
        this.emitter.setMaxListeners(200);
    }

    async onModuleInit(): Promise<void> {
        this.wireQueueEvents();
        await this.wireRedisSubscriber();
    }

    async onModuleDestroy(): Promise<void> {
        // Cancel all debounce timers
        for (const timer of this.countTimers.values()) {
            clearTimeout(timer);
        }
        this.countTimers.clear();

        // Disconnect subscriber
        try {
            this.subscriber.disconnect();
        } catch {
            // ignore
        }
    }

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    /**
     * Returns an Observable<MessageEvent> that emits queue bus events belonging
     * to the requested network, plus a heartbeat every 25 s.
     */
    streamForNetwork(network: string): Observable<MessageEvent> {
        const events$ = fromEvent<QueueBusEvent>(this.emitter, BUS_EVENT).pipe(
            filter((evt) => evt.network === network || evt.type === 'se-event'),
            map((evt) => this.toMessageEvent(evt)),
        );

        const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
            map(() => this.toMessageEvent({ type: 'heartbeat', network, ts: Date.now() })),
        );

        return merge(events$, heartbeat$);
    }

    // ---------------------------------------------------------------------------
    // BullMQ QueueEvents wiring
    // ---------------------------------------------------------------------------

    private wireQueueEvents(): void {
        for (const { network, baseName, queue, events } of this.registry.getAllEntries()) {
            const emit = (extra: Record<string, unknown>) => {
                const evt: QueueBusEvent = { network, queueBase: baseName, ...extra } as QueueBusEvent;
                this.emitter.emit(BUS_EVENT, evt);
                this.scheduleCountsChanged(network, baseName, queue);
            };

            events.on('completed', ({ jobId, returnvalue }) => {
                emit({ type: 'job-completed', jobId, returnValue: returnvalue });
            });

            events.on('failed', ({ jobId, failedReason, prev }) => {
                emit({ type: 'job-failed', jobId, failedReason, attemptsMade: prev ?? 0 });
            });

            events.on('active', ({ jobId }) => {
                emit({ type: 'job-active', jobId });
            });

            events.on('waiting', ({ jobId }) => {
                emit({ type: 'job-waiting', jobId });
            });

            events.on('stalled', ({ jobId }) => {
                emit({ type: 'job-stalled', jobId });
            });

            events.on('error', (error: Error) => {
                this.logger.warn(
                    `QueueEvents error for ${network}:${baseName}: ${error.message}`,
                );
            });
        }
    }

    // ---------------------------------------------------------------------------
    // Counts-changed debounce
    // ---------------------------------------------------------------------------

    private scheduleCountsChanged(network: string, baseName: string, queue: Queue): void {
        const timerKey = `${network}:${baseName}`;

        // Reset the timer on each trigger (debounce — not throttle)
        const existing = this.countTimers.get(timerKey);
        if (existing !== undefined) {
            clearTimeout(existing);
        }

        const timer = setTimeout(async () => {
            this.countTimers.delete(timerKey);
            try {
                const counts = await queue.getJobCounts(
                    'waiting',
                    'active',
                    'completed',
                    'failed',
                    'delayed',
                    'paused',
                );
                const evt: QueueBusEvent = {
                    network,
                    queueBase: baseName,
                    type: 'counts-changed',
                    counts,
                };
                this.emitter.emit(BUS_EVENT, evt);
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to fetch job counts for ${timerKey}: ${msg}`);
            }
        }, COUNTS_DEBOUNCE_MS);

        this.countTimers.set(timerKey, timer);
    }

    // ---------------------------------------------------------------------------
    // Redis subscriber for se:events channel
    // ---------------------------------------------------------------------------

    private async wireRedisSubscriber(): Promise<void> {
        const config = getRedictConfig();

        // Subscriber connections must NOT share the same ioredis instance used
        // by BullMQ — once subscribed the connection cannot issue other commands.
        // Strip keyPrefix: subscriber channels are not prefixed by ioredis
        // automatically when using subscribe().
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { keyPrefix: _keyPrefix, ...connectionOpts } = config;

        this.subscriber = new Redis({
            ...connectionOpts,
            // Keep the connection alive even if the server is momentarily unavailable.
            lazyConnect: false,
        });

        this.subscriber.on('error', (error: Error) => {
            this.logger.warn(`Redis subscriber error: ${error.message}`);
        });

        try {
            await this.subscriber.subscribe(SE_CHANNEL);
            this.logger.log(`Subscribed to Redis channel "${SE_CHANNEL}"`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to subscribe to "${SE_CHANNEL}": ${msg}`);
        }

        this.subscriber.on('message', (_channel: string, message: string) => {
            try {
                const parsed: unknown = JSON.parse(message);
                const evt: QueueBusEvent = {
                    network: '*',       // se:events are cross-network; filter at consumer
                    queueBase: '',
                    type: 'se-event',
                    payload: parsed,
                };
                this.emitter.emit(BUS_EVENT, evt);
            } catch {
                // Non-JSON message — ignore
            }
        });
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private toMessageEvent(evt: Record<string, unknown>): MessageEvent {
        return {
            data: JSON.stringify(evt),
            type: String(evt['type'] ?? 'event'),
            id: String(Date.now()),
        };
    }
}
