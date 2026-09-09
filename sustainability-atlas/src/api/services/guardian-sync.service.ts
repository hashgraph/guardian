import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getRedictConfig } from '@shared/config/redict.config';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';

export interface GuardianSyncInstanceStatus {
    id: string;
    aemUrl: string;
    connected: boolean;
    eventsProcessed: number;
    lastEventAt: number | null;
    lastSubject: string | null;
}

export interface GuardianSyncEventDto {
    subject: string;
    refType: string | null;
    refId: string | null;
    action: string;
    instanceId: string | null;
    createdAt: string;
}

export interface GuardianSyncEventPageDto {
    total: number;
    page: number;
    pageSize: number;
    events: GuardianSyncEventDto[];
}

export interface GuardianSyncStatusDto {
    network: string;
    /** true when a guardian-sync heartbeat is present (key not expired). */
    enabled: boolean;
    leader: boolean;
    updatedAt: number | null;
    instances: GuardianSyncInstanceStatus[];
}

/**
 * Reads the guardian-sync heartbeat that the (opt-in) guardian-sync process
 * writes to `se:guardian-sync:status:<network>` in Redict. When no guardian-sync
 * is running for the network, the key is absent → `enabled: false`.
 */
@Injectable()
export class GuardianSyncService implements OnModuleDestroy {
    private readonly logger = new Logger(GuardianSyncService.name);
    private readonly redis: Redis;

    constructor(private readonly dataSources: NetworkDataSourceRegistry) {
        // Strip keyPrefix so the literal key written by guardian-sync's REDICT_PUB
        // (which has no prefix) is read as-is — same pattern as QueueEventsBus.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { keyPrefix: _keyPrefix, ...connectionOpts } = getRedictConfig();
        this.redis = new Redis({
            ...connectionOpts,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
        this.redis.on('error', (err: Error) =>
            this.logger.warn(`Redis error: ${err.message}`),
        );
    }

    async getStatus(network: string): Promise<GuardianSyncStatusDto> {
        const net = network.toLowerCase();
        const empty: GuardianSyncStatusDto = {
            network: net,
            enabled: false,
            leader: false,
            updatedAt: null,
            instances: [],
        };
        try {
            const raw = await this.redis.get(`se:guardian-sync:status:${net}`);
            if (!raw) return empty;
            const parsed = JSON.parse(raw) as Partial<GuardianSyncStatusDto>;
            return {
                network: net,
                enabled: true,
                leader: !!parsed.leader,
                updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
                instances: Array.isArray(parsed.instances)
                    ? (parsed.instances as GuardianSyncInstanceStatus[])
                    : [],
            };
        } catch (err) {
            this.logger.warn(
                `getStatus(${net}) failed: ${err instanceof Error ? err.message : String(err)}`,
            );
            return empty;
        }
    }

    /**
     * Paginated audit of what guardian-sync received + triggered for the network,
     * newest first. `subject` is an optional case-insensitive contains-filter
     * (e.g. "block_complete" matches "external-events.block_complete").
     */
    async getEvents(
        network: string,
        opts: { page?: number; pageSize?: number; subject?: string } = {},
    ): Promise<GuardianSyncEventPageDto> {
        const net = network.toLowerCase();
        const page = Math.max(opts.page ?? 1, 1);
        const pageSize = Math.min(Math.max(opts.pageSize ?? 10, 1), 200);
        const subject = (opts.subject ?? '').trim();
        const offset = (page - 1) * pageSize;
        const empty: GuardianSyncEventPageDto = { total: 0, page, pageSize, events: [] };
        const where = `network = $1 AND ($2 = '' OR subject ILIKE '%' || $2 || '%')`;
        try {
            const ds = this.dataSources.getDataSource(net);
            const countRows: Array<{ total: string }> = await ds.query(
                `SELECT COUNT(*)::text AS total FROM guardian_event_log WHERE ${where}`,
                [net, subject],
            );
            const events: GuardianSyncEventDto[] = await ds.query(
                `SELECT subject, "refType", "refId", action, "instanceId", "createdAt"
                 FROM guardian_event_log
                 WHERE ${where}
                 ORDER BY "createdAt" DESC
                 LIMIT $3 OFFSET $4`,
                [net, subject, pageSize, offset],
            );
            return { total: parseInt(countRows[0]?.total ?? '0', 10), page, pageSize, events };
        } catch (err) {
            // Table absent (guardian-sync never ran) or network unknown → empty.
            this.logger.debug(
                `getEvents(${net}) failed: ${err instanceof Error ? err.message : String(err)}`,
            );
            return empty;
        }
    }

    onModuleDestroy(): void {
        try {
            this.redis.disconnect();
        } catch {
            // ignore
        }
    }
}
