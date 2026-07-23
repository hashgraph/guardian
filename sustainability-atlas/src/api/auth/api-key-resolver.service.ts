import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { SystemDataSource } from '@api/database/system-database.module';
import { RedisService } from '@shared/redis/redis.service';
import { User } from '@shared/entities/auth/user.entity';
import {
    AuthenticatedUser,
    UserAuthSnapshot,
    AUTHZ_CACHE_TTL_SECONDS,
    authzCacheKey,
} from './auth.types';

/** Headers an API key may arrive in. */
interface KeyHeaders {
    authorization?: string;
    'x-api-key'?: string;
}

/** Cached api_keys row (by prefix). keyHash is a sha256 hash — safe to cache. */
interface ApiKeyRow {
    id: string;
    userId: string;
    keyHash: string;
    /** ISO string or null; re-checked against now() each request even from cache. */
    expiresAt: string | null;
}

// Fixed-length stand-in so unknown-prefix and wrong-secret take the same time.
const DUMMY_HASH = '0'.repeat(64);
// Key rows rarely change; revoke() invalidates the entry, so revocation is immediate.
const APIKEY_ROW_CACHE_TTL_SECONDS = 60;
// Throttle the best-effort lastUsedAt write to at most once per window per key.
const LASTUSED_THROTTLE_SECONDS = 60;

/**
 * Resolves programmatic API keys (`se_<prefix>_<secret>`) to an AuthenticatedUser.
 *
 * Shared by ApiKeyGuard and DataAccessGuard so the caching lives in one place:
 *  - key row cached by prefix (`apikey:prefix:<prefix>`) — skips the SELECT;
 *  - owner resolved via the SHARED `authz:user:<id>` snapshot (invalidated on
 *    admin role/status/quota changes) — skips the findOne;
 *  - lastUsedAt write throttled to ≤ once/window per key.
 *
 * Fail-closed: a cache miss (or Redis down) falls back to the DB. The secret is
 * constant-time compared against the stored hash; DUMMY_HASH equalises the
 * unknown-prefix / wrong-secret timing. Never logs the key/secret.
 */
@Injectable()
export class ApiKeyResolver {
    constructor(
        private readonly config: ConfigService,
        private readonly systemDataSource: SystemDataSource,
        private readonly redis: RedisService,
    ) {}

    /** Extracts a raw key from `Authorization: Bearer …` or the `x-api-key` header. */
    extractKey(headers: KeyHeaders): string | null {
        const auth = headers.authorization;
        if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
        const header = headers['x-api-key'];
        if (header) return header.trim();
        return null;
    }

    /**
     * Resolves a raw key to a req.user, or null when missing / malformed / unknown /
     * wrong-secret / revoked / expired / owner-inactive. Callers decide how to react.
     */
    async resolve(raw: string | null): Promise<AuthenticatedUser | null> {
        if (!raw) return null;

        const parsed = this.parse(raw);
        const pepper = this.config.get<string>('app.auth.apiKeyPepper') ?? '';
        // Hash the supplied secret before branching so missing-prefix and
        // wrong-secret take the same path/time.
        const suppliedHash = createHash('sha256')
            .update(pepper + (parsed?.secret ?? ''))
            .digest('hex');

        // 1. Resolve the key row — cache-through by prefix.
        let row: ApiKeyRow | null = null;
        if (parsed) {
            const rowKey = `apikey:prefix:${parsed.prefix}`;
            row = await this.redis.getJson<ApiKeyRow>(rowKey);
            if (!row) {
                const rows = await this.systemDataSource.getDataSource().query<
                    { id: string; userId: string; keyHash: string; expiresAt: Date | null }[]
                >(
                    `SELECT id, "userId", "keyHash", "expiresAt" FROM api_keys
                      WHERE prefix = $1 AND status = 'active'
                      LIMIT 1`,
                    [parsed.prefix],
                );
                const r = rows[0];
                if (r) {
                    row = {
                        id: r.id,
                        userId: r.userId,
                        keyHash: r.keyHash,
                        expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
                    };
                    await this.redis.setJson(rowKey, row, APIKEY_ROW_CACHE_TTL_SECONDS);
                }
            }
            // Respect expiry even when the row came from the cache.
            if (row && row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) {
                row = null;
            }
        }

        const expected = row?.keyHash ?? DUMMY_HASH;
        const a = Buffer.from(suppliedHash, 'utf8');
        const b = Buffer.from(expected, 'utf8');
        const match = a.length === b.length && timingSafeEqual(a, b);
        if (!row || !match) return null;

        // 2. Resolve the owner — shared authz snapshot cache.
        const snapKey = authzCacheKey(row.userId);
        let snap = await this.redis.getJson<UserAuthSnapshot>(snapKey);
        if (!snap || snap.email === undefined) {
            const user = await this.systemDataSource
                .getRepository(User)
                .findOne({ where: { id: row.userId } });
            if (!user) return null;
            snap = {
                role: user.role,
                isActive: user.isActive,
                tokenVersion: user.tokenVersion,
                apiQuotaPerHour: user.apiQuotaPerHour,
                email: user.email,
            };
            await this.redis.setJson(snapKey, snap, AUTHZ_CACHE_TTL_SECONDS);
        }
        if (!snap.isActive) return null;

        // 3. Throttled last-used stamp.
        void this.touchLastUsed(row.id);

        return {
            id: row.userId,
            email: snap.email,
            role: snap.role,
            tokenVersion: snap.tokenVersion,
            sessionId: '',
            apiQuotaPerHour: snap.apiQuotaPerHour,
            authVia: 'apikey',
        };
    }

    /** Parses `se_<prefix>_<secret>`; prefix is hex so it contains no '_'. */
    private parse(raw: string): { prefix: string; secret: string } | null {
        const parts = raw.split('_');
        if (parts.length < 3 || parts[0] !== 'se') return null;
        const prefix = parts[1];
        const secret = parts.slice(2).join('_');
        if (!prefix || !secret) return null;
        return { prefix, secret };
    }

    /** Writes lastUsedAt at most once per window (Redis SET NX marker throttles it). */
    private async touchLastUsed(keyId: string): Promise<void> {
        const first = await this.redis.setIfAbsent(`apikey:lastused:${keyId}`, LASTUSED_THROTTLE_SECONDS);
        if (!first) return;
        this.systemDataSource
            .getDataSource()
            .query(`UPDATE api_keys SET "lastUsedAt" = now() WHERE id = $1`, [keyId])
            .catch(() => undefined);
    }
}
