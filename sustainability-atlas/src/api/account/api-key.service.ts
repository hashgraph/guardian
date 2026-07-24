import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { SystemDataSource, returningRows } from '@api/database/system-database.module';
import { RedisService } from '@shared/redis/redis.service';

/** Public-safe API key fields — NEVER includes keyHash or the secret. */
export interface SafeApiKey {
    id: string;
    name: string;
    prefix: string;
    status: 'active' | 'revoked';
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
}

/** Returned ONCE on creation — `key` is the full secret, shown a single time. */
export interface CreatedApiKey {
    id: string;
    name: string;
    prefix: string;
    key: string;
    createdAt: Date;
}

/**
 * API key generation and management.
 *
 * Key format: `se_<prefix>_<secret>`
 *   - prefix: 5 random bytes hex (40-bit, NO '_' so the split is unambiguous);
 *     stored plaintext + UNIQUE-indexed for O(1) lookup.
 *   - secret: 32 random bytes base64url (256-bit). Stored ONLY as
 *     sha256(API_KEY_PEPPER || secret). The raw secret is returned once, never
 *     persisted or logged.
 *
 * The prefix is an INDEPENDENT random segment — never a slice of the secret —
 * so it leaks nothing about the secret at rest or in the UI.
 *
 * Max active keys/user is configurable (rateLimit.apiKeyMaxActivePerUser,
 * default 3) and enforced ATOMICALLY: a per-user advisory lock serialises
 * count+insert so concurrent creates cannot exceed the cap (no TOCTOU race).
 */
@Injectable()
export class ApiKeyService {
    constructor(
        private readonly systemDataSource: SystemDataSource,
        private readonly config: ConfigService,
        private readonly redis: RedisService,
    ) {}

    private pepper(): string {
        return this.config.get<string>('app.auth.apiKeyPepper') ?? '';
    }

    private maxActive(): number {
        return this.config.get<number>('app.rateLimit.apiKeyMaxActivePerUser') ?? 3;
    }

    /** sha256(pepper || secret) hex — deterministic so lookup-by-hash is O(1). */
    private hashSecret(secret: string): string {
        return createHash('sha256').update(this.pepper() + secret).digest('hex');
    }

    async create(userId: string, name: string): Promise<CreatedApiKey> {
        const max = this.maxActive();
        const prefix = randomBytes(5).toString('hex');        // 40-bit, hex (no '_')
        const secret = randomBytes(32).toString('base64url'); // 256-bit
        const keyHash = this.hashSecret(secret);

        const created = await this.systemDataSource.getDataSource().transaction(async (m) => {
            // Serialise count+insert per user so the max-N cap can't be raced.
            await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`apikey:${userId}`]);

            const cnt = await m.query<{ c: number }[]>(
                `SELECT count(*)::int AS c FROM api_keys WHERE "userId" = $1 AND status = 'active'`,
                [userId],
            );
            if ((cnt[0]?.c ?? 0) >= max) {
                throw new ConflictException(
                    `You already have the maximum of ${max} active API keys. Revoke one before creating another.`,
                );
            }

            const rows = await m.query<{ id: string; createdAt: Date }[]>(
                `INSERT INTO api_keys ("userId", name, prefix, "keyHash", status)
                 VALUES ($1, $2, $3, $4, 'active')
                 RETURNING id, "createdAt"`,
                [userId, name, prefix, keyHash],
            );
            return rows[0];
        });

        return { id: created.id, name, prefix, key: `se_${prefix}_${secret}`, createdAt: created.createdAt };
    }

    /** Lists the caller's own keys (active + revoked). Never returns the secret/hash. */
    async list(userId: string): Promise<SafeApiKey[]> {
        return this.systemDataSource.getDataSource().query<SafeApiKey[]>(
            `SELECT id, name, prefix, status, "lastUsedAt", "expiresAt", "createdAt"
               FROM api_keys
              WHERE "userId" = $1
              ORDER BY "createdAt" DESC`,
            [userId],
        );
    }

    /**
     * Revokes one of the caller's own active keys.
     * Ownership is enforced IN the WHERE clause (AND "userId" = $2); a miss
     * returns 404 so a key id belonging to another user is indistinguishable
     * from a non-existent one (no existence disclosure / IDOR).
     */
    async revoke(userId: string, id: string): Promise<void> {
        const result = await this.systemDataSource.getDataSource().query(
            `UPDATE api_keys SET status = 'revoked'
              WHERE id = $1 AND "userId" = $2 AND status = 'active'
            RETURNING prefix`,
            [id, userId],
        );
        // UPDATE ... RETURNING returns a [rows, count] tuple on pg — see returningRows().
        const prefix = returningRows<{ prefix: string }>(result)[0]?.prefix;
        if (!prefix) {
            throw new NotFoundException('API key not found');
        }
        // Invalidate the ApiKeyGuard prefix cache so the revoked key stops working
        // immediately rather than lingering until the cache TTL expires.
        void this.redis.del(`apikey:prefix:${prefix}`);
    }
}
