import { describe, expect, it } from '@jest/globals';
import { NotificationsService } from '@api/notifications/notifications.service';

class FakeRepo {
    public unreadCountCalls = 0;
    public markReadCalls: Array<[string, string, string]> = [];
    public markAllReadCalls: Array<[string, string]> = [];

    async list(): Promise<{ items: unknown[]; nextCursor: string | null }> {
        return { items: [], nextCursor: null };
    }

    async unreadCount(userId: string, network: string): Promise<number> {
        this.unreadCountCalls++;
        return 5;
    }

    async markRead(userId: string, network: string, id: string): Promise<boolean> {
        this.markReadCalls.push([userId, network, id]);
        return true;
    }

    async markAllRead(userId: string, network: string): Promise<number> {
        this.markAllReadCalls.push([userId, network]);
        return 3;
    }
}

class FakeRedisService {
    public store = new Map<string, unknown>();
    public setJsonCalls: Array<{ key: string; value: unknown; ttlSeconds: number }> = [];
    public delCalls: string[] = [];

    async getJson<T>(key: string): Promise<T | null> {
        return this.store.has(key) ? (this.store.get(key) as T) : null;
    }

    async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        this.setJsonCalls.push({ key, value, ttlSeconds });
        this.store.set(key, value);
    }

    async del(key: string): Promise<void> {
        this.delCalls.push(key);
        this.store.delete(key);
    }
}

describe('NotificationsService', () => {
    it('unreadCount: cache hit skips the repository entirely', async () => {
        const repo = new FakeRepo();
        const redis = new FakeRedisService();
        redis.store.set('notif-count:user-1:mainnet', 42);

        const service = new NotificationsService(repo as any, redis as any);
        const count = await service.unreadCount('user-1', 'mainnet');

        expect(count).toBe(42);
        expect(repo.unreadCountCalls).toBe(0);
    });

    it('unreadCount: cache miss populates the cache with TTL 30', async () => {
        const repo = new FakeRepo();
        const redis = new FakeRedisService();

        const service = new NotificationsService(repo as any, redis as any);
        const count = await service.unreadCount('user-1', 'mainnet');

        expect(count).toBe(5);
        expect(repo.unreadCountCalls).toBe(1);
        expect(redis.setJsonCalls).toHaveLength(1);
        expect(redis.setJsonCalls[0]).toMatchObject({ key: 'notif-count:user-1:mainnet', value: 5, ttlSeconds: 30 });
    });

    it('markRead invalidates the unread-count cache key', async () => {
        const repo = new FakeRepo();
        const redis = new FakeRedisService();
        redis.store.set('notif-count:user-1:mainnet', 9);

        const service = new NotificationsService(repo as any, redis as any);
        const updated = await service.markRead('user-1', 'mainnet', 'notif-1');

        expect(updated).toBe(true);
        expect(repo.markReadCalls).toEqual([['user-1', 'mainnet', 'notif-1']]);
        expect(redis.delCalls).toEqual(['notif-count:user-1:mainnet']);
    });

    it('markAllRead invalidates the unread-count cache key', async () => {
        const repo = new FakeRepo();
        const redis = new FakeRedisService();
        redis.store.set('notif-count:user-1:mainnet', 9);

        const service = new NotificationsService(repo as any, redis as any);
        const count = await service.markAllRead('user-1', 'mainnet');

        expect(count).toBe(3);
        expect(repo.markAllReadCalls).toEqual([['user-1', 'mainnet']]);
        expect(redis.delCalls).toEqual(['notif-count:user-1:mainnet']);
    });
});
