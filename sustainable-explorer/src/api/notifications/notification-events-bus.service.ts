import { Injectable, Logger, OnModuleInit, OnModuleDestroy, MessageEvent } from '@nestjs/common';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Observable, fromEvent, interval, merge } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { getRedictConfig } from '@shared/config/redict.config';

interface NotificationBusEvent {
    userId: string;
    network: string;
    type: string;
    [key: string]: unknown;
}

const BUS_EVENT = 'notification-bus-event';
const SE_NOTIF_CHANNEL = 'se:notifications';
const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Fans out `se:notifications` Redis pub/sub messages (published by
 * NotificationScanService) to per-user SSE Observable streams.
 *
 * Structural mirror of QueueEventsBus (dedicated subscriber connection +
 * EventEmitter + RxJS fromEvent/interval/merge), but keyed by userId instead
 * of network, and with no BullMQ QueueEvents wiring — this bus only forwards
 * the scan service's pub/sub nudges.
 */
@Injectable()
export class NotificationEventsBus implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NotificationEventsBus.name);
    private readonly emitter = new EventEmitter();

    /** Subscriber connection — dedicated, cannot issue other commands once subscribed. */
    private subscriber!: Redis;

    constructor() {
        // Increase max listeners to avoid Node warnings when many SSE clients connect.
        this.emitter.setMaxListeners(200);
    }

    async onModuleInit(): Promise<void> {
        await this.wireRedisSubscriber();
    }

    async onModuleDestroy(): Promise<void> {
        try {
            this.subscriber.disconnect();
        } catch {
            // ignore
        }
    }

    /**
     * Returns an Observable<MessageEvent> that emits notification events
     * belonging to the requesting user, plus a heartbeat every 25s.
     */
    streamForUser(userId: string): Observable<MessageEvent> {
        const events$ = fromEvent<NotificationBusEvent>(this.emitter, BUS_EVENT).pipe(
            filter((evt) => evt.userId === userId),
            map((evt) => this.toMessageEvent(evt)),
        );

        const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
            map(() => this.toMessageEvent({ type: 'heartbeat', ts: Date.now() })),
        );

        return merge(events$, heartbeat$);
    }

    private async wireRedisSubscriber(): Promise<void> {
        const config = getRedictConfig();

        // Subscriber connections must NOT share the same ioredis instance used
        // elsewhere — once subscribed the connection cannot issue other commands.
        // Strip keyPrefix: subscriber channels are not prefixed by ioredis
        // automatically when using subscribe().
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { keyPrefix: _keyPrefix, ...connectionOpts } = config;

        this.subscriber = new Redis({
            ...connectionOpts,
            lazyConnect: false,
        });

        this.subscriber.on('error', (error: Error) => {
            this.logger.warn(`Redis subscriber error: ${error.message}`);
        });

        try {
            await this.subscriber.subscribe(SE_NOTIF_CHANNEL);
            this.logger.log(`Subscribed to Redis channel "${SE_NOTIF_CHANNEL}"`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to subscribe to "${SE_NOTIF_CHANNEL}": ${msg}`);
        }

        this.subscriber.on('message', (_channel: string, message: string) => {
            try {
                const parsed = JSON.parse(message) as NotificationBusEvent;
                if (!parsed || typeof parsed.userId !== 'string') return;
                this.emitter.emit(BUS_EVENT, parsed);
            } catch {
                // Non-JSON message — ignore
            }
        });
    }

    private toMessageEvent(evt: Record<string, unknown>): MessageEvent {
        return {
            data: JSON.stringify(evt),
            type: String(evt['type'] ?? 'event'),
            id: String(Date.now()),
        };
    }
}
