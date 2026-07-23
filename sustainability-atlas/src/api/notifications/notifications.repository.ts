import { Injectable } from '@nestjs/common';
import { SystemDataSource, returningRows } from '@api/database/system-database.module';

export interface NotificationRow {
    id: string;
    network: string;
    type: string;
    projectKey: string;
    payload: Record<string, unknown>;
    isRead: boolean;
    createdAt: Date;
}

export interface ListNotificationsOptions {
    cursor?: string;
    limit: number;
    unreadOnly: boolean;
}

export interface ListNotificationsResult {
    items: NotificationRow[];
    nextCursor: string | null;
}

interface DecodedCursor {
    createdAt: string;
    id: string;
}

@Injectable()
export class NotificationsRepository {
    constructor(private readonly systemDataSource: SystemDataSource) {}

    /**
     * Keyset pagination on ("createdAt" DESC, id DESC) — stable under concurrent
     * inserts, unlike OFFSET pagination. Fetches limit+1 rows so nextCursor is
     * only set when a following page actually exists.
     */
    async list(
        userId: string,
        network: string,
        options: ListNotificationsOptions,
    ): Promise<ListNotificationsResult> {
        const ds = this.systemDataSource.getDataSource();
        const { limit, unreadOnly } = options;

        const conditions: string[] = [`"userId" = $1`, `network = $2`];
        const params: unknown[] = [userId, network];

        if (unreadOnly) {
            conditions.push(`"isRead" = false`);
        }

        const decoded = this.decodeCursor(options.cursor);
        if (decoded) {
            params.push(decoded.createdAt, decoded.id);
            conditions.push(
                `("createdAt", id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
            );
        }

        params.push(limit + 1);
        const whereClause = conditions.join(' AND ');

        const rows: NotificationRow[] = await ds.query(
            `SELECT id, network, type, "projectKey", payload, "isRead", "createdAt"
               FROM notifications
              WHERE ${whereClause}
              ORDER BY "createdAt" DESC, id DESC
              LIMIT $${params.length}`,
            params,
        );

        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        const last = items[items.length - 1];
        const nextCursor = hasMore && last
            ? this.encodeCursor(last.createdAt, last.id)
            : null;

        return { items, nextCursor };
    }

    async unreadCount(userId: string, network: string): Promise<number> {
        const ds = this.systemDataSource.getDataSource();
        const rows: Array<{ count: string }> = await ds.query(
            `SELECT COUNT(*)::text AS count
               FROM notifications
              WHERE "userId" = $1 AND network = $2 AND "isRead" = false`,
            [userId, network],
        );
        return parseInt(rows[0]?.count ?? '0', 10);
    }

    /**
     * Marks a single notification read, scoped to the owning user + network.
     * Returns false when no row matched (wrong id, wrong owner, or already-read
     * rows still match — RETURNING confirms the row exists and belongs to the
     * caller, not that it changed state).
     */
    async markRead(userId: string, network: string, id: string): Promise<boolean> {
        const ds = this.systemDataSource.getDataSource();
        const result = await ds.query(
            `UPDATE notifications
                SET "isRead" = true
              WHERE id = $1 AND "userId" = $2 AND network = $3
              RETURNING id`,
            [id, userId, network],
        );
        return returningRows<{ id: string }>(result).length > 0;
    }

    /** Marks all of a user's unread notifications (for a network) read. Returns the count updated. */
    async markAllRead(userId: string, network: string): Promise<number> {
        const ds = this.systemDataSource.getDataSource();
        const result = await ds.query(
            `UPDATE notifications
                SET "isRead" = true
              WHERE "userId" = $1 AND network = $2 AND "isRead" = false
              RETURNING id`,
            [userId, network],
        );
        return returningRows<{ id: string }>(result).length;
    }

    /** Permanently deletes all of a user's notifications (for a network). Returns the count deleted. */
    async clearAll(userId: string, network: string): Promise<number> {
        const ds = this.systemDataSource.getDataSource();
        const result = await ds.query(
            `DELETE FROM notifications
              WHERE "userId" = $1 AND network = $2
            RETURNING id`,
            [userId, network],
        );
        return returningRows<{ id: string }>(result).length;
    }

    private encodeCursor(createdAt: Date, id: string): string {
        const iso = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
        return Buffer.from(`${iso}|${id}`, 'utf8').toString('base64');
    }

    private decodeCursor(cursor: string | undefined): DecodedCursor | null {
        if (!cursor) return null;
        try {
            const decoded = Buffer.from(cursor, 'base64').toString('utf8');
            const sepIndex = decoded.lastIndexOf('|');
            if (sepIndex === -1) return null;
            const createdAt = decoded.slice(0, sepIndex);
            const id = decoded.slice(sepIndex + 1);
            if (!createdAt || !id) return null;
            return { createdAt, id };
        } catch {
            return null;
        }
    }
}
