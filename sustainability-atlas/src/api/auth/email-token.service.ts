import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { SystemDataSource, returningRows } from '@api/database/system-database.module';
import { EmailToken } from '@shared/entities/auth/email-token.entity';

// ── TTL constants ─────────────────────────────────────────────────────────────

/** Email-verification token lifetime: 24 hours. */
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** Password-reset token lifetime: 1 hour. */
const RESET_TTL_MS = 60 * 60 * 1000;

// ── Link paths ────────────────────────────────────────────────────────────────
// One canonical path per flow; the frontend routes must match these.

const VERIFY_PATH = '/verify-email';
const RESET_PATH = '/reset-password';

// ── EmailTokenService ─────────────────────────────────────────────────────────

/**
 * Issues and consumes single-use, expiring email tokens for the email-
 * verification and password-reset flows.
 *
 * Security model:
 *  - Raw token: crypto.randomBytes(32) → base64url (high entropy, URL-safe).
 *  - Stored hash: sha256(PASSWORD_PEPPER || rawToken) hex — rainbow-table resistant.
 *  - Raw token is RETURNED to the caller and NEVER persisted or logged.
 *  - consumeToken is ONE atomic UPDATE WHERE usedAt IS NULL AND expiresAt > now()
 *    RETURNING userId — no read-then-write TOCTOU race.
 *  - Second consume of the same token returns null (usedAt is already set).
 *  - Expired tokens are rejected at the database level (expiresAt check in UPDATE).
 *
 * Link builder (buildLink): reads APP_PUBLIC_URL directly from process.env per
 * repo convention (database.config.ts + methodologies.service.ts read process.env
 * directly; ConfigService injection is reserved for the NestJS DI path).
 */
@Injectable()
export class EmailTokenService {
    private readonly logger = new Logger(EmailTokenService.name);

    constructor(private readonly systemDataSource: SystemDataSource) {}

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Dev-only verbose logging for the email-token flows, gated on MAIL_LOG_LINKS.
     * Emitted at log level (not debug) so it shows without LOG_LEVEL=debug.
     * NEVER logs a raw token by itself — see hashPrefix(). The full link IS
     * logged here (it contains the raw token) but ONLY in dev when the operator
     * has explicitly opted in via MAIL_LOG_LINKS=true (the link is a credential;
     * this must never be true in production).
     */
    private debug(msg: string): void {
        if (process.env.MAIL_LOG_LINKS === 'true') {
            this.logger.log(`[email-token] ${msg}`);
        }
    }

    /**
     * First 12 hex chars of the stored sha256 hash — safe to print. Lets you
     * correlate an issued token with the later consume attempt in the logs
     * without ever revealing the raw token. Same raw token + same pepper always
     * yields the same prefix; a mismatch means the pepper or token changed.
     */
    private hashPrefix(hash: string): string {
        return `${hash.slice(0, 12)}…`;
    }

    /**
     * One-way hash for storage: sha256(pepper || rawToken) → hex string.
     * Deterministic (unsalted) so lookup by hash is O(1) via the UNIQUE index.
     * PASSWORD_PEPPER mitigates rainbow-table attacks if the DB is leaked.
     */
    private hashToken(raw: string): string {
        const pepper = process.env.PASSWORD_PEPPER ?? '';
        return createHash('sha256').update(pepper + raw).digest('hex');
    }

    /**
     * Builds the absolute URL sent in the email.
     * Reads APP_PUBLIC_URL from process.env (repo convention — no ConfigService).
     * No trailing slash on APP_PUBLIC_URL; path begins with '/'.
     */
    private buildLink(path: string, rawToken: string): string {
        const base = (process.env.APP_PUBLIC_URL ?? '').replace(/\/$/, '');
        const link = `${base}${path}?token=${encodeURIComponent(rawToken)}`;
        // Dev-only: print the clickable link so you can verify without relying on
        // email delivery. Gated on MAIL_LOG_LINKS (never enable in production).
        this.debug(`link built ${path} → ${link}`);
        return link;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Issues a new email token for the given userId and type.
     *
     * Generates a high-entropy raw token, stores only its sha256(pepper||token)
     * hash, and returns the RAW token so the caller can embed it in the email
     * link. The raw token is NEVER logged or persisted.
     *
     * TTL: 24 h for 'verify', 1 h for 'reset'.
     */
    async issueToken(userId: string, type: 'verify' | 'reset'): Promise<string> {
        const raw = randomBytes(32).toString('base64url');
        const tokenHash = this.hashToken(raw);
        const ttlMs = type === 'verify' ? VERIFY_TTL_MS : RESET_TTL_MS;
        const expiresAt = new Date(Date.now() + ttlMs);

        const repo = this.systemDataSource.getRepository(EmailToken);
        const row = repo.create({
            userId,
            type,
            tokenHash,
            expiresAt,
            usedAt: null,
        });
        await repo.save(row);

        this.debug(
            `issued ${type} token userId=${userId} hash=${this.hashPrefix(tokenHash)} ` +
            `expiresAt=${expiresAt.toISOString()}`,
        );

        return raw;
    }

    /**
     * Consumes a raw token, enforcing single-use and expiry atomically.
     *
     * Performs ONE atomic UPDATE ... SET "usedAt" = now()
     *   WHERE "tokenHash" = $hash AND type = $type
     *     AND "usedAt" IS NULL AND "expiresAt" > now()
     * RETURNING "userId"
     *
     * Returns the userId string on success, or null if the token is not found,
     * already used, expired, or of the wrong type. The caller must treat null
     * as a generic failure (no distinction between these cases — no enumeration).
     */
    async consumeToken(rawToken: string, type: 'verify' | 'reset'): Promise<string | null> {
        const tokenHash = this.hashToken(rawToken);

        // Dev trace: compare this hash prefix with the one logged at issue time.
        // If they differ → the token was altered in transit or PASSWORD_PEPPER
        // changed since issue; if they match but the consume fails → see the
        // warn diagnostic below (row gone / already used / expired).
        this.debug(`consume attempt type=${type} hash=${this.hashPrefix(tokenHash)} rawLen=${rawToken.length}`);

        // Double-quote camelCase columns as required by bootstrapSystemSchema.
        const result: unknown = await this.systemDataSource.getDataSource().query(
            `UPDATE auth_email_tokens
                SET "usedAt" = now()
              WHERE "tokenHash" = $1
                AND type        = $2
                AND "usedAt"    IS NULL
                AND "expiresAt" > now()
           RETURNING "userId"`,
            [tokenHash, type],
        );

        // TypeORM 0.3.x (pg driver) returns UPDATE ... RETURNING as a
        // [rows, affectedCount] tuple, not a plain rows array — see returningRows().
        // Gate success on the extracted userId, never on result.length (the tuple
        // has length 2 even on a no-match, which previously produced the 401 +
        // burned single-use token).
        const userId = returningRows<{ userId: string }>(result)[0]?.userId;

        if (userId) {
            this.debug(`consumed OK type=${type} userId=${userId} hash=${this.hashPrefix(tokenHash)}`);
            return userId;
        }

        // Diagnostic (never logs the raw token) — pinpoints WHY consume failed:
        // not-found (hash mismatch / pepper change / never stored), wrong-type,
        // already-used, or expired.
        try {
            const diag = await this.systemDataSource.getDataSource().query<
                { type: string; usedAt: Date | null; expiresAt: Date; expired: boolean }[]
            >(
                `SELECT type, "usedAt", "expiresAt", ("expiresAt" <= now()) AS expired
                   FROM auth_email_tokens WHERE "tokenHash" = $1`,
                [tokenHash],
            );
            if (diag.length === 0) {
                this.logger.warn(
                    `consumeToken(${type}): no row for this token hash — token altered in transit, ` +
                    'never stored (issueToken failed), or PASSWORD_PEPPER changed since issue.',
                );
            } else {
                const d = diag[0];
                this.logger.warn(
                    `consumeToken(${type}) rejected: storedType=${d.type} ` +
                    `alreadyUsed=${d.usedAt !== null} expired=${d.expired} ` +
                    `(expiresAt=${new Date(d.expiresAt).toISOString()}, now=${new Date().toISOString()})`,
                );
            }
        } catch {
            /* diagnostic only — never affects the result */
        }

        return null;
    }

    /**
     * Builds the absolute email-verification link containing the raw token.
     * Centralized here so the controller and any future consumer share one path.
     *
     * Path: {APP_PUBLIC_URL}/verify-email?token={rawToken}
     */
    buildVerificationLink(rawToken: string): string {
        return this.buildLink(VERIFY_PATH, rawToken);
    }

    /**
     * Builds the absolute password-reset link containing the raw token.
     * Centralized here so the controller and any future consumer share one path.
     *
     * Path: {APP_PUBLIC_URL}/reset-password?token={rawToken}
     */
    buildResetLink(rawToken: string): string {
        return this.buildLink(RESET_PATH, rawToken);
    }
}
