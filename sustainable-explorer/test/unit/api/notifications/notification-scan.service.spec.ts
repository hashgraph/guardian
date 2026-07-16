import { describe, expect, it, jest } from '@jest/globals';
import { NotificationScanService } from '@api/notifications/notification-scan.service';
import { issuanceSource } from '@api/notifications/notification-sources/issuance.source';

// ---------------------------------------------------------------------------
// Hand-rolled fakes (no NestJS Test harness) — matches the style of
// test/unit/api/policy-graph.builder.spec.ts.
// ---------------------------------------------------------------------------

class FakeQueryable {
    public calls: Array<{ sql: string; params: unknown[] }> = [];
    private readonly responses: unknown[][];

    constructor(responses: unknown[][]) {
        this.responses = responses;
    }

    async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
        this.calls.push({ sql, params });
        const next = this.responses.shift();
        return next ?? [];
    }
}

class FakeNetworkRegistry {
    public getDataSourceCalls: string[] = [];
    constructor(private readonly ds: FakeQueryable) {}
    getDataSource(network: string): FakeQueryable {
        this.getDataSourceCalls.push(network);
        return this.ds;
    }
}

class FakeSystemDataSource {
    constructor(private readonly ds: FakeQueryable) {}
    getDataSource(): FakeQueryable {
        return this.ds;
    }
}

class FakeConfigService {
    get(): undefined {
        return undefined;
    }
}

class FakeRedisService {
    public delCalls: string[] = [];
    async del(key: string): Promise<void> {
        this.delCalls.push(key);
    }
}

class FakeRedisClient {
    public publishCalls: Array<{ channel: string; message: string }> = [];
    async publish(channel: string, message: string): Promise<number> {
        this.publishCalls.push({ channel, message });
        return 1;
    }
}

function buildService(netDs: FakeQueryable, sysDs: FakeQueryable) {
    const registry = new FakeNetworkRegistry(netDs);
    const systemDataSource = new FakeSystemDataSource(sysDs);
    const configService = new FakeConfigService();
    const redisService = new FakeRedisService();

    const service = new NotificationScanService(
        registry as any,
        systemDataSource as any,
        configService as any,
        redisService as any,
    );
    const redisClient = new FakeRedisClient();
    (service as any).redisClient = redisClient;

    return { service, registry, redisService, redisClient };
}

describe('NotificationScanService', () => {
    it('advances the watermark to the batch max mint_consensus_timestamp', async () => {
        const netDs = new FakeQueryable([
            [{ lastValue: '100' }],                          // watermark read
            [                                                 // mint batch
                { mint_consensus_timestamp: '150', project_key: 'p1', token_id: 't1', amount: '5', mint_date: null },
                { mint_consensus_timestamp: '200', project_key: 'p1', token_id: 't1', amount: '5', mint_date: null },
            ],
            [],                                               // business_view lookup — no PROJECT match
            [],                                               // watermark upsert (no return needed)
        ]);
        const sysDs = new FakeQueryable([]);

        const { service } = buildService(netDs, sysDs);
        (service as any).isLeader.set('mainnet', true);

        await service.scanSource('mainnet', issuanceSource);

        const upsertCall = netDs.calls.find((c) => c.sql.includes('notification_watermarks') && c.sql.includes('INSERT'));
        expect(upsertCall).toBeDefined();
        expect(upsertCall!.params[0]).toBe('issuance');
        expect(upsertCall!.params[1]).toBe('200');
    });

    it('is idempotent on re-run: empty RETURNING publishes and invalidates nothing', async () => {
        const netDs = new FakeQueryable([
            [{ lastValue: '0' }],
            [
                { mint_consensus_timestamp: '10', project_key: 'p1', token_id: 't1', amount: '1', mint_date: null },
            ],
            [{ id: 'bv-1', projectKey: 'p1', displayName: 'Project One', relatedTopicId: '0.0.1' }],
            [], // watermark upsert
        ]);
        const sysDs = new FakeQueryable([
            [{ userId: 'user-1', projectKey: 'bv-1' }],  // one watcher
            [],                                           // INSERT ... RETURNING — nothing inserted (already seen)
        ]);

        const { service, redisClient, redisService } = buildService(netDs, sysDs);

        await service.scanSource('mainnet', issuanceSource);

        expect(redisClient.publishCalls).toHaveLength(0);
        expect(redisService.delCalls).toHaveLength(0);
    });

    it('publishes and invalidates the cache for newly-inserted notifications', async () => {
        const netDs = new FakeQueryable([
            [{ lastValue: '0' }],
            [
                { mint_consensus_timestamp: '10', project_key: 'p1', token_id: 't1', amount: '1', mint_date: null },
            ],
            [{ id: 'bv-1', projectKey: 'p1', displayName: 'Project One', relatedTopicId: '0.0.1' }],
            [],
        ]);
        const sysDs = new FakeQueryable([
            [{ userId: 'user-1', projectKey: 'bv-1' }],
            [{ userId: 'user-1' }], // newly inserted
        ]);

        const { service, redisClient, redisService } = buildService(netDs, sysDs);

        await service.scanSource('mainnet', issuanceSource);

        expect(redisClient.publishCalls).toHaveLength(1);
        expect(redisService.delCalls).toEqual(['notif-count:user-1:mainnet']);
    });

    it('enriches the payload with registryName and methodology from the business_view lookup', async () => {
        const netDs = new FakeQueryable([
            [{ lastValue: '0' }],
            [
                { mint_consensus_timestamp: '10', project_key: 'p1', token_id: 't1', amount: '1', mint_date: null },
            ],
            [{
                id: 'bv-1', projectKey: 'p1', displayName: 'Project One', relatedTopicId: '0.0.1',
                registryName: 'Gold Standard', methodology: 'GS TPDDTEC v3.1.0',
            }],
            [],
        ]);
        const sysDs = new FakeQueryable([
            [{ userId: 'user-1', projectKey: 'bv-1' }],
            [{ userId: 'user-1' }],
        ]);

        const { service } = buildService(netDs, sysDs);

        await service.scanSource('mainnet', issuanceSource);

        const insertCall = sysDs.calls.find((c) => c.sql.includes('INSERT INTO notifications'));
        expect(insertCall).toBeDefined();
        const payloadsParam = insertCall!.params[4] as string[];
        const payload = JSON.parse(payloadsParam[0]);
        expect(payload.registryName).toBe('Gold Standard');
        expect(payload.methodology).toBe('GS TPDDTEC v3.1.0');
    });

    it('loops again within the same tick when the batch hits exactly the 500 limit', async () => {
        const fullBatch = Array.from({ length: 500 }, (_, i) => ({
            mint_consensus_timestamp: String(i + 1),
            project_key: 'p1',
            token_id: 't1',
            amount: '1',
            mint_date: null,
        }));

        const netDs = new FakeQueryable([
            [{ lastValue: '0' }],   // 1st iteration: watermark
            fullBatch,              // 1st iteration: mints (exactly 500 -> loop again)
            [],                     // 1st iteration: business_view (no match, so no watcher/insert queries)
            [],                     // 1st iteration: watermark upsert
            [{ lastValue: '500' }], // 2nd iteration: watermark
            [],                     // 2nd iteration: mints — empty, stop
        ]);
        const sysDs = new FakeQueryable([]);

        const { service } = buildService(netDs, sysDs);

        await service.scanSource('mainnet', issuanceSource);

        const mintQueries = netDs.calls.filter((c) => c.sql.includes('FROM project_mint_link'));
        expect(mintQueries).toHaveLength(2);
        // Second iteration reads from the watermark the first iteration advanced to.
        expect(mintQueries[1].params[0]).toBe('500');
    });

    it('is a no-op when the batch is empty (no watermark write, no business_view read)', async () => {
        const netDs = new FakeQueryable([
            [{ lastValue: '999' }],
            [], // empty mint batch
        ]);
        const sysDs = new FakeQueryable([]);

        const { service } = buildService(netDs, sysDs);

        await service.scanSource('mainnet', issuanceSource);

        expect(netDs.calls).toHaveLength(2);
        expect(sysDs.calls).toHaveLength(0);
    });

    it('a non-leader tick makes zero DB calls', async () => {
        const netDs = new FakeQueryable([]);
        const sysDs = new FakeQueryable([]);
        const { service, registry } = buildService(netDs, sysDs);

        // isLeader map has no entry for 'mainnet' -> falsy -> tick() must return early.
        await (service as any).tick('mainnet');

        expect(registry.getDataSourceCalls).toHaveLength(0);
        expect(netDs.calls).toHaveLength(0);
        expect(sysDs.calls).toHaveLength(0);
    });

    it('a tick already running for a network is skipped (re-entrancy guard)', async () => {
        const netDs = new FakeQueryable([]);
        const sysDs = new FakeQueryable([]);
        const { service, registry } = buildService(netDs, sysDs);

        (service as any).isLeader.set('mainnet', true);
        (service as any).running.set('mainnet', true);

        await (service as any).tick('mainnet');

        expect(registry.getDataSourceCalls).toHaveLength(0);
    });

    it('prunes only read notifications older than the retention window when the tick counter hits the threshold', async () => {
        const netDs = new FakeQueryable([]);
        const sysDs = new FakeQueryable([]);
        const { service } = buildService(netDs, sysDs);

        (service as any).isLeader.set('mainnet', true);
        (service as any).tickCount = 29; // one short of the threshold (30)

        await (service as any).tick('mainnet');

        const pruneCall = sysDs.calls.find((c) => c.sql.includes('DELETE FROM notifications'));
        expect(pruneCall).toBeDefined();
        expect(pruneCall!.sql).toContain('"isRead" = true');
        expect(pruneCall!.params[0]).toBe('30'); // FakeConfigService.get() -> undefined -> 30-day default
    });

    it('does not prune on a tick that does not hit the prune threshold', async () => {
        const netDs = new FakeQueryable([]);
        const sysDs = new FakeQueryable([]);
        const { service } = buildService(netDs, sysDs);

        (service as any).isLeader.set('mainnet', true);
        (service as any).tickCount = 0; // -> becomes 1 after the tick, 1 % 30 !== 0

        await (service as any).tick('mainnet');

        const pruneCall = sysDs.calls.find((c) => c.sql.includes('DELETE FROM notifications'));
        expect(pruneCall).toBeUndefined();
    });
});
