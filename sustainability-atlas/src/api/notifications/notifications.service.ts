import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import {
    NotificationsRepository,
    ListNotificationsOptions,
    ListNotificationsResult,
} from './notifications.repository';

const UNREAD_COUNT_CACHE_TTL_SECONDS = 30;

@Injectable()
export class NotificationsService {
    constructor(
        private readonly repo: NotificationsRepository,
        private readonly redis: RedisService,
    ) {}

    private unreadCountCacheKey(userId: string, network: string): string {
        return `notif-count:${userId}:${network}`;
    }

    async list(
        userId: string,
        network: string,
        options: ListNotificationsOptions,
    ): Promise<ListNotificationsResult> {
        return this.repo.list(userId, network, options);
    }

    /**
     * Cached 30s at `notif-count:{userId}:{network}` so the topbar badge never
     * issues a live COUNT(*) on every render. Invalidated by
     * NotificationScanService on new-insert (best-effort) and by this service
     * on mark-read / mark-all-read (authoritative — always invalidated).
     */
    async unreadCount(userId: string, network: string): Promise<number> {
        const key = this.unreadCountCacheKey(userId, network);
        const cached = await this.redis.getJson<number>(key);
        if (cached !== null) return cached;

        const fresh = await this.repo.unreadCount(userId, network);
        await this.redis.setJson(key, fresh, UNREAD_COUNT_CACHE_TTL_SECONDS);
        return fresh;
    }

    async markRead(userId: string, network: string, id: string): Promise<boolean> {
        const updated = await this.repo.markRead(userId, network, id);
        await this.redis.del(this.unreadCountCacheKey(userId, network));
        return updated;
    }

    async markAllRead(userId: string, network: string): Promise<number> {
        const count = await this.repo.markAllRead(userId, network);
        await this.redis.del(this.unreadCountCacheKey(userId, network));
        return count;
    }

    async clearAll(userId: string, network: string): Promise<number> {
        const count = await this.repo.clearAll(userId, network);
        await this.redis.del(this.unreadCountCacheKey(userId, network));
        return count;
    }
}
