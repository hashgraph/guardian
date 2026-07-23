import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import axios from 'axios';
import { getWorkerNetwork } from '@shared/config/bullmq.config';
import { getGuardianInstances, GuardianInstanceConfig } from '@shared/config/configuration';
import { GuardianEventRouter } from './guardian-event-router';

interface StreamState {
    controller: AbortController;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    backoffMs: number;
}

/** Per-instance status surfaced to the sync page via Redict. */
interface InstanceStat {
    id: string;
    aemUrl: string;
    connected: boolean;
    eventsProcessed: number;
    lastEventAt: number | null;
    lastSubject: string | null;
}

/**
 * Subscribes to each configured Guardian instance's Application Events Module
 * stream (`GET <aemUrl>/api/events/subscribe`) and forwards parsed events.
 *
 * - OPT-IN: does nothing unless GUARDIAN_INSTANCES lists an instance whose
 *   composite network matches this process's HEDERA_NET (one process/instance).
 * - Leader-elected per network (se:guardian-sub:leader:${network}) so HA
 *   replicas yield a single active subscriber — same lock pattern as
 *   SyncSchedulerService.
 * - RESILIENT: every stream/connect error is caught, logged, and retried with
 *   capped exponential backoff. It MUST NEVER throw out of onModuleInit or
 *   crash the process — a dead Guardian instance never affects the worker/API.
 *
 * Parsed events are handed to GuardianEventRouter, which enqueues targeted jobs
 * onto the worker's existing queues.
 */
@Injectable()
export class GuardianEventSubscriber implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(GuardianEventSubscriber.name);
    private readonly instanceId = `guardian-sync-${process.pid}-${Date.now()}`;
    private readonly network = getWorkerNetwork();
    private readonly leaderKey = `se:guardian-sub:leader:${this.network}`;
    private readonly baseBackoffMs = parseInt(
        process.env.GUARDIAN_SYNC_RECONNECT_BACKOFF_MS || '1000', 10,
    );
    private readonly maxBackoffMs = 30_000;

    private leaderInterval: ReturnType<typeof setInterval> | null = null;
    private isLeader = false;
    private streamsStarted = false;
    private shuttingDown = false;
    private readonly streams = new Map<string, StreamState>();

    // Status surfaced to the sync page (read by the API at se:guardian-sync:status:<net>).
    private readonly stats = new Map<string, InstanceStat>();
    private statusInterval: ReturnType<typeof setInterval> | null = null;
    private readonly statusKey = `se:guardian-sync:status:${this.network}`;

    constructor(
        @Inject('REDICT_PUB') private readonly redis: Redis,
        private readonly router: GuardianEventRouter,
    ) {}

    async onModuleInit(): Promise<void> {
        try {
            const allInstances = getGuardianInstances();
            const instances = allInstances.filter(i => i.network === this.network);
            if (instances.length === 0) {
                const configured = allInstances.map(i => i.network).join(', ') || 'none';
                this.logger.warn(
                    `guardian-sync IDLE: no GUARDIAN_INSTANCES entry matches HEDERA_NET="${this.network}". ` +
                    `Configured instance networks: [${configured}]. ` +
                    `Fix: set HEDERA_NET to one of those, or add a matching GUARDIAN_INSTANCES entry.`,
                );
                return;
            }

            this.isLeader = await this.tryAcquireLeader();
            if (this.isLeader) {
                this.startStreams(instances);
            } else {
                this.logger.log('Another guardian-sync instance is leader — standby');
            }

            // Renew/acquire leadership; take over (start streams) if the leader died.
            this.leaderInterval = setInterval(async () => {
                try {
                    this.isLeader = await this.tryAcquireLeader();
                    if (this.isLeader) {
                        await this.redis.expire(this.leaderKey, 30);
                        this.startStreams(instances);
                    }
                } catch {
                    // Silent — will retry next interval.
                }
            }, 15000);
        } catch (err) {
            // Never let subscriber init crash the process.
            this.logger.error(
                `guardian-sync subscriber init failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    onModuleDestroy(): void {
        this.shuttingDown = true;
        if (this.leaderInterval) {
            clearInterval(this.leaderInterval);
            this.leaderInterval = null;
        }
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        for (const state of this.streams.values()) {
            if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
            state.controller.abort();
        }
        this.streams.clear();
        if (this.isLeader) {
            this.redis.del(this.leaderKey).catch(() => {});
            this.redis.del(this.statusKey).catch(() => {});
        }
    }

    /** Same distributed-lock pattern as SyncSchedulerService (30s TTL, renewed 15s). */
    private async tryAcquireLeader(): Promise<boolean> {
        const result = await this.redis.set(this.leaderKey, this.instanceId, 'EX', 30, 'NX');
        if (result === 'OK') return true;
        const current = await this.redis.get(this.leaderKey);
        return current === this.instanceId;
    }

    /** Idempotent — starts one stream consumer per instance exactly once. */
    private startStreams(instances: GuardianInstanceConfig[]): void {
        if (this.streamsStarted || this.shuttingDown) return;
        this.streamsStarted = true;
        this.logger.log(`Acquired leadership — opening ${instances.length} AEM stream(s)`);
        for (const instance of instances) {
            this.streams.set(instance.id, {
                controller: new AbortController(),
                reconnectTimer: null,
                backoffMs: this.baseBackoffMs,
            });
            this.stats.set(instance.id, {
                id: instance.id,
                aemUrl: instance.aemUrl,
                connected: false,
                eventsProcessed: 0,
                lastEventAt: null,
                lastSubject: null,
            });
            void this.connect(instance);
        }
        // Heartbeat the status to Redict so the sync page can show it (key expires
        // at 30s, so a stopped guardian-sync disappears from the UI on its own).
        void this.publishStatus();
        this.statusInterval = setInterval(() => void this.publishStatus(), 10_000);
    }

    private async connect(instance: GuardianInstanceConfig): Promise<void> {
        if (this.shuttingDown) return;
        const state = this.streams.get(instance.id);
        if (!state) return;
        // A reconnect attempt needs a fresh AbortController.
        state.controller = new AbortController();

        const url = `${instance.aemUrl.replace(/\/$/, '')}/api/events/subscribe`;
        try {
            const response = await axios.get(url, {
                responseType: 'stream',
                timeout: 0,
                signal: state.controller.signal,
                headers: instance.authHeader ? { Authorization: instance.authHeader } : {},
            });

            this.logger.log(`Connected to AEM stream for ${instance.id} (${url})`);
            const stat = this.stats.get(instance.id);
            if (stat) stat.connected = true;
            void this.publishStatus();
            let buffer = '';

            response.data.on('data', (chunk: Buffer) => {
                state.backoffMs = this.baseBackoffMs; // healthy stream → reset backoff
                buffer += chunk.toString('utf-8');
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const raw of lines) {
                    this.handleLine(instance, raw);
                }
            });
            response.data.on('end', () => this.scheduleReconnect(instance, 'end'));
            response.data.on('close', () => this.scheduleReconnect(instance, 'close'));
            response.data.on('error', (err: Error) =>
                this.scheduleReconnect(instance, `error: ${err.message}`),
            );
        } catch (err) {
            this.scheduleReconnect(
                instance,
                `connect failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    /**
     * Parses one line of the AEM chunked-JSON-array stream. Lines look like
     * `{"subject":...,"payload":...},` (the opening `[` and closing
     * `{"connection":"closed"}]` are unparseable fragments and are skipped).
     */
    private handleLine(instance: GuardianInstanceConfig, raw: string): void {
        let line = raw.trim();
        if (!line) return;
        if (line.startsWith('[')) line = line.slice(1).trim();
        if (line.endsWith(',')) line = line.slice(0, -1).trim();
        if (!line || line === ']' || line.includes('"connection"')) return;

        let event: { subject?: unknown; payload?: unknown };
        try {
            event = JSON.parse(line);
        } catch {
            return; // partial/unparseable fragment — skip
        }
        if (typeof event.subject !== 'string') return;

        if (instance.eventFilter && !instance.eventFilter.includes(event.subject)) return;

        const stat = this.stats.get(instance.id);
        if (stat) {
            stat.eventsProcessed++;
            stat.lastEventAt = Date.now();
            stat.lastSubject = event.subject;
        }

        this.handleEvent(instance.id, event.subject, event.payload);
    }

    /** Dispatch to the router. route() never throws, but guard defensively. */
    private handleEvent(instanceId: string, subject: string, payload: unknown): void {
        // Firehose (debug): every event + a truncated payload. Run with
        // LOG_LEVEL=debug to see ALL subjects (incl. ignored ones) and discover
        // the actual payload shapes of undocumented policy-* events.
        let preview: string;
        try {
            preview = JSON.stringify(payload);
        } catch {
            preview = String(payload);
        }
        if (preview.length > 400) preview = preview.slice(0, 400) + '...';
        this.logger.debug(`event ${subject} payload=${preview}`);

        void this.router.route(subject, payload, instanceId).catch(err =>
            this.logger.debug(
                `route(${subject}) failed: ${err instanceof Error ? err.message : String(err)}`,
            ),
        );
    }

    private scheduleReconnect(instance: GuardianInstanceConfig, reason: string): void {
        if (this.shuttingDown) return;
        const state = this.streams.get(instance.id);
        if (!state || state.reconnectTimer) return; // a reconnect is already pending

        const stat = this.stats.get(instance.id);
        if (stat) stat.connected = false;
        void this.publishStatus();

        const delay = state.backoffMs;
        state.backoffMs = Math.min(state.backoffMs * 2, this.maxBackoffMs);
        this.logger.warn(
            `AEM stream for ${instance.id} dropped (${reason}) — reconnecting in ${delay}ms`,
        );
        state.reconnectTimer = setTimeout(() => {
            state.reconnectTimer = null;
            void this.connect(instance);
        }, delay);
    }

    /**
     * Best-effort heartbeat of subscriber status to Redict for the sync page.
     * The key expires at 30s, so a stopped guardian-sync drops out of the UI on
     * its own. Never throws — status must not affect the stream loop.
     */
    private async publishStatus(): Promise<void> {
        if (this.shuttingDown) return;
        try {
            const payload = JSON.stringify({
                network: this.network,
                leader: this.isLeader,
                updatedAt: Date.now(),
                instances: Array.from(this.stats.values()),
            });
            await this.redis.set(this.statusKey, payload, 'EX', 30);
        } catch {
            // ignore — status is non-critical
        }
    }
}
