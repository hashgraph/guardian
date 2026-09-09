import { describe, expect, it } from '@jest/globals';
import { NotificationsRepository } from '@api/notifications/notifications.repository';

class FakeQueryable {
    public calls: Array<{ sql: string; params: unknown[] }> = [];
    constructor(private readonly response: unknown[]) {}

    async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
        this.calls.push({ sql, params });
        return this.response;
    }
}

class FakeSystemDataSource {
    constructor(private readonly ds: FakeQueryable) {}
    getDataSource(): FakeQueryable {
        return this.ds;
    }
}

function makeRow(createdAt: string, id: string) {
    return {
        id,
        network: 'mainnet',
        type: 'issuance',
        projectKey: 'bv-1',
        payload: {},
        isRead: false,
        createdAt: new Date(createdAt),
    };
}

describe('NotificationsRepository', () => {
    it('list() requests limit+1 rows and only sets nextCursor when the extra row exists', async () => {
        const rows = [makeRow('2026-01-03T00:00:00.000Z', 'id-3'), makeRow('2026-01-02T00:00:00.000Z', 'id-2')];
        const ds = new FakeQueryable(rows); // exactly `limit` rows -> no extra row
        const repo = new NotificationsRepository(new FakeSystemDataSource(ds) as any);

        const result = await repo.list('user-1', 'mainnet', { limit: 2, unreadOnly: false });

        expect(ds.calls[0].params[ds.calls[0].params.length - 1]).toBe(3); // limit+1
        expect(result.items).toHaveLength(2);
        expect(result.nextCursor).toBeNull();
    });

    it('sets nextCursor when limit+1 rows come back', async () => {
        const rows = [
            makeRow('2026-01-03T00:00:00.000Z', 'id-3'),
            makeRow('2026-01-02T00:00:00.000Z', 'id-2'),
            makeRow('2026-01-01T00:00:00.000Z', 'id-1'), // the extra (limit+1-th) row
        ];
        const ds = new FakeQueryable(rows);
        const repo = new NotificationsRepository(new FakeSystemDataSource(ds) as any);

        const result = await repo.list('user-1', 'mainnet', { limit: 2, unreadOnly: false });

        expect(result.items).toHaveLength(2);
        expect(result.nextCursor).not.toBeNull();
    });

    it('adds the isRead=false predicate when unreadOnly is true', async () => {
        const ds = new FakeQueryable([]);
        const repo = new NotificationsRepository(new FakeSystemDataSource(ds) as any);

        await repo.list('user-1', 'mainnet', { limit: 20, unreadOnly: true });

        expect(ds.calls[0].sql).toContain('"isRead" = false');
    });

    it('does not add the isRead predicate when unreadOnly is false', async () => {
        const ds = new FakeQueryable([]);
        const repo = new NotificationsRepository(new FakeSystemDataSource(ds) as any);

        await repo.list('user-1', 'mainnet', { limit: 20, unreadOnly: false });

        expect(ds.calls[0].sql).not.toContain('"isRead" = false');
    });

    it('markRead returns false when RETURNING is empty', async () => {
        const ds = new FakeQueryable([]); // no matching row
        const repo = new NotificationsRepository(new FakeSystemDataSource(ds) as any);

        const updated = await repo.markRead('user-1', 'mainnet', 'notif-1');

        expect(updated).toBe(false);
    });

    it('markRead returns true when RETURNING has a row', async () => {
        const ds = new FakeQueryable([{ id: 'notif-1' }]);
        const repo = new NotificationsRepository(new FakeSystemDataSource(ds) as any);

        const updated = await repo.markRead('user-1', 'mainnet', 'notif-1');

        expect(updated).toBe(true);
    });

    it('clearAll issues a DELETE scoped to userId + network and returns the RETURNING count', async () => {
        const ds = new FakeQueryable([{ id: 'notif-1' }, { id: 'notif-2' }]);
        const repo = new NotificationsRepository(new FakeSystemDataSource(ds) as any);

        const count = await repo.clearAll('user-1', 'mainnet');

        expect(ds.calls[0].sql).toContain('DELETE FROM notifications');
        expect(ds.calls[0].params).toEqual(['user-1', 'mainnet']);
        expect(count).toBe(2);
    });
});
