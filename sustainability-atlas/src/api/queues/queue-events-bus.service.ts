import { Injectable, Logger, OnModuleInit, OnModuleDestroy, MessageEvent } from '@nestjs/common';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { Observable, fromEvent, interval, merge, defer } from 'rxjs';
import { map, filter, finalize } from 'rxjs/operators';
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
const COUNTS_MAX_WAIT_MS = 2_000;
const IDLE_TEARDOWN_MS = 10 * 60_000;

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
    /** When the currently-pending counts refresh was first requested. */
    private readonly countFirstPendingAt = new Map<string, number>();

    /** Live SSE subscribers per network, and the streams opened for them. */
    private readonly subscriberCounts = new Map<string, number>();
    private readonly wiredNetworks = new Set<string>();
    private readonly teardownTimers = new Map<string, ReturnType<typeof setTimeout>>();
    /** Networks whose streams are mid-close — see releaseNetwork. */
    private readonly tearingDown = new Set<string>();

    constructor(private readonly registry: QueueRegistry) {
        // Increase max listeners to avoid Node warnings when many SSE clients connect.
        this.emitter.setMaxListeners(200);
    }

    async onModuleInit(): Promise<void> {
        // QueueEvents are wired per network when a subscriber arrives — see
        // streamForNetwork.
        await this.wireRedisSubscriber();
    }

    async onModuleDestroy(): Promise<void> {
        // Cancel all debounce timers
        for (const timer of this.countTimers.values()) {
            clearTimeout(timer);
        }
        this.countTimers.clear();
        this.countFirstPendingAt.clear();

        for (const timer of this.teardownTimers.values()) {
            clearTimeout(timer);
        }
        this.teardownTimers.clear();
        this.tearingDown.clear();
        this.wiredNetworks.clear();
        this.subscriberCounts.clear();

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
        // defer + finalize so the QueueEvents streams for this network are opened
        // when a client actually subscribes and released when the last one goes
        // away, rather than being held open for the life of the process.
        return defer(() => {
            this.retainNetwork(network);

            const events$ = fromEvent<QueueBusEvent>(this.emitter, BUS_EVENT).pipe(
                filter((evt) => evt.network === network || evt.type === 'se-event'),
                map((evt) => this.toMessageEvent(evt)),
            );

            const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
                map(() => this.toMessageEvent({ type: 'heartbeat', network, ts: Date.now() })),
            );

            return merge(events$, heartbeat$).pipe(
                finalize(() => this.releaseNetwork(network)),
            );
        });
    }

    // ---------------------------------------------------------------------------
    // Per-network QueueEvents lifecycle
    // ---------------------------------------------------------------------------

    /** Opens this network's streams if this is the first subscriber. */
    private retainNetwork(network: string): void {
        const pendingTeardown = this.teardownTimers.get(network);
        if (pendingTeardown) {
            // Reconnecting inside the grace window — keep what is already open.
            clearTimeout(pendingTeardown);
            this.teardownTimers.delete(network);
        }

        const next = (this.subscriberCounts.get(network) ?? 0) + 1;
        this.subscriberCounts.set(network, next);
        // Never wire while a teardown is still closing this network's streams;
        // that path re-wires itself when it finishes.
        if (next === 1 && !this.wiredNetworks.has(network) && !this.tearingDown.has(network)) {
            this.wireQueueEvents(network);
            this.wiredNetworks.add(network);
            this.logger.log(`Opened QueueEvents streams for "${network}"`);
        }
    }

    /**
     * Drops a subscriber, closing the network's streams once none are left.
     *
     * The close is delayed: dashboards reconnect constantly (a page reload, an
     * SSE retry), and tearing 10 streams down and straight back up on every
     * blip costs more than briefly holding them idle.
     */
    private releaseNetwork(network: string): void {
        const next = Math.max(0, (this.subscriberCounts.get(network) ?? 0) - 1);
        this.subscriberCounts.set(network, next);
        if (next > 0 || this.teardownTimers.has(network)) return;

        const timer = setTimeout(() => {
            this.teardownTimers.delete(network);
            if ((this.subscriberCounts.get(network) ?? 0) > 0) return;

            // Mark the teardown in flight and keep the network flagged as wired
            // until it finishes. releaseEventsForNetwork closes ~10 streams one
            // at a time; clearing `wiredNetworks` up front let a subscriber
            // arriving mid-close re-wire, which attached a SECOND listener set to
            // the streams the close had not reached yet (every event delivered
            // twice) and created fresh streams for the ones it had, which the
            // still-running loop then closed — leaving the network marked wired
            // with dead streams and no path back to re-wiring.
            this.tearingDown.add(network);
            void this.registry.releaseEventsForNetwork(network)
                .then(() => this.logger.log(`Closed idle QueueEvents streams for "${network}"`))
                .catch((error: Error) => this.logger.warn(
                    `Failed closing QueueEvents for "${network}": ${error.message}`,
                ))
                .finally(() => {
                    this.tearingDown.delete(network);
                    this.wiredNetworks.delete(network);
                    // A subscriber that arrived while the close was running was
                    // told to wait; wire it now that the streams are gone.
                    if ((this.subscriberCounts.get(network) ?? 0) > 0) {
                        this.wireQueueEvents(network);
                        this.wiredNetworks.add(network);
                        this.logger.log(`Re-opened QueueEvents streams for "${network}"`);
                    }
                });
        }, IDLE_TEARDOWN_MS);

        // Never let this timer hold the process open at shutdown.
        timer.unref?.();
        this.teardownTimers.set(network, timer);
    }

    // ---------------------------------------------------------------------------
    // BullMQ QueueEvents wiring
    // ---------------------------------------------------------------------------

    private wireQueueEvents(network: string): void {
        for (const { baseName, queue, events } of this.registry.acquireEventsForNetwork(network)) {
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

        // Debounce WITH a maximum wait. A pure trailing debounce never fires on a
        // continuously busy queue — each job event resets the timer before it
        // elapses — so counts froze exactly when the queue was moving fastest and
        // an operator most needed to see it. Past COUNTS_MAX_WAIT_MS the pending
        // refresh is allowed through regardless of how fast events arrive.
        const firstPendingAt = this.countFirstPendingAt.get(timerKey);
        if (firstPendingAt === undefined) {
            this.countFirstPendingAt.set(timerKey, Date.now());
        } else if (Date.now() - firstPendingAt >= COUNTS_MAX_WAIT_MS) {
            // Let the in-flight timer stand so it fires now rather than being
            // pushed out again.
            return;
        }

        // Reset the timer on each trigger (debounce — not throttle)
        const existing = this.countTimers.get(timerKey);
        if (existing !== undefined) {
            clearTimeout(existing);
        }

        const timer = setTimeout(async () => {
            this.countTimers.delete(timerKey);
            this.countFirstPendingAt.delete(timerKey);
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

        // Re-subscribe on every 'ready'. ioredis reconnects the socket by itself
        // but does NOT restore subscriptions, so a one-shot subscribe here meant
        // that after any Redict blip this API instance silently stopped receiving
        // se:events forever — SSE clients stayed connected and simply never saw
        // another document-loaded or mv-refreshed event. The notification bus
        // already carried this fix; the queue bus did not.
        const subscribe = async () => {
            try {
                await this.subscriber.subscribe(SE_CHANNEL);
                this.logger.log(`Subscribed to Redis channel "${SE_CHANNEL}"`);
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to subscribe to "${SE_CHANNEL}": ${msg}`);
            }
        };
        this.subscriber.on('ready', () => void subscribe());
        await subscribe();

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
