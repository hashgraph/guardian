import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { SystemDataSource } from '@api/database/system-database.module';
import { User } from '@shared/entities/auth/user.entity';
import { RefreshToken } from '@shared/entities/auth/refresh-token.entity';
import { AccessTokenPayload, RefreshContext } from './auth.types';

// ── Issued-refresh result ─────────────────────────────────────────────────────

export interface IssuedRefreshToken {
    rawToken: string;
    familyId: string;
    sessionId: string;
    expiresAt: Date;
}

export type RotateRefreshResult =
    | (IssuedRefreshToken & { reuseDetected?: false })
    | { reuseDetected: true };

// ── TokenService ──────────────────────────────────────────────────────────────

/**
 * Manages access JWT lifecycle and refresh-token rotation with reuse-detection
 * and family-wide invalidation.
 *
 * Refresh tokens are high-entropy (32 random bytes → base64url).
 * They are stored ONLY as sha256(app.auth.passwordPepper||rawToken) —
 * the raw value is returned to the caller once and never persisted.
 *
 * Rotation protocol:
 *   - active   → rotate: old row → 'rotated', new 'active' row in same family/session.
 *   - rotated  → REUSE ATTACK: revoke entire family, return { reuseDetected: true }.
 *   - revoked  → REUSE ATTACK: revoke entire family, return { reuseDetected: true }.
 *   - expired  → reject with UnauthorizedException.
 *
 * Session absolute TTL is enforced by checking createdAt + sessionAbsoluteTtlDays.
 */
@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        private readonly systemDataSource: SystemDataSource,
    ) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    private getAuthConfig() {
        return this.config.get<{
            jwtAccessSecret: string;
            accessTokenTtlMinutes: number;
            refreshTokenTtlDays: number;
            sessionAbsoluteTtlDays: number;
            passwordPepper: string;
        }>('app.auth')!;
    }

    /**
     * Hashes the refresh token for storage: sha256(pepper || rawToken).
     * Deterministic (not salted) so lookup by hash is O(1).
     */
    private hashRefreshToken(rawToken: string): string {
        const pepper = this.getAuthConfig().passwordPepper;
        return createHash('sha256').update(pepper + rawToken).digest('hex');
    }

    // ── Access tokens ─────────────────────────────────────────────────────────

    /**
     * Signs a short-lived access JWT for the given user.
     * Payload includes tokenVersion so JwtAuthGuard can detect invalidated sessions.
     */
    async signAccessToken(user: User, sessionId: string): Promise<string> {
        const { jwtAccessSecret, accessTokenTtlMinutes } = this.getAuthConfig();
        const payload: AccessTokenPayload = {
            sub: user.id,
            jti: randomUUID(),
            sessionId,
            tokenVersion: user.tokenVersion,
            role: user.role,
            email: user.email,
            isActive: user.isActive,
            emailVerified: user.emailVerifiedAt != null,
            apiQuotaPerHour: user.apiQuotaPerHour,
        };
        return this.jwtService.signAsync(payload, {
            secret: jwtAccessSecret,
            expiresIn: `${accessTokenTtlMinutes}m`,
        });
    }

    /**
     * Verifies an access token and returns the typed payload.
     * Throws UnauthorizedException on invalid or expired tokens.
     */
    async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
        const { jwtAccessSecret } = this.getAuthConfig();
        try {
            return await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
                secret: jwtAccessSecret,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired access token');
        }
    }

    // ── Refresh tokens ────────────────────────────────────────────────────────

    /**
     * Issues a new refresh token for the given user.
     *
     * Generates a cryptographically random 32-byte token, hashes it with
     * sha256(pepper||token), and inserts a refresh_tokens row with the hash.
     * Returns the raw token so the caller can set it in the httpOnly cookie.
     */
    async issueRefreshToken(user: User, ctx: RefreshContext): Promise<IssuedRefreshToken> {
        const { refreshTokenTtlDays } = this.getAuthConfig();

        const rawToken = randomBytes(32).toString('base64url');
        const tokenHash = this.hashRefreshToken(rawToken);
        const familyId = ctx.familyId ?? randomUUID();
        const sessionId = ctx.sessionId ?? randomUUID();
        const expiresAt = new Date(Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000);

        const repo = this.systemDataSource.getRepository(RefreshToken);
        const row = repo.create({
            userId: user.id,
            familyId,
            tokenHash,
            sessionId,
            status: 'active',
            replacedById: null,
            userAgent: ctx.userAgent ?? null,
            ip: ctx.ip ?? null,
            expiresAt,
        });
        await repo.save(row);

        return { rawToken, familyId, sessionId, expiresAt };
    }

    /**
     * Rotates a refresh token.
     *
     * Returns the new issued token on success.
     * Returns { reuseDetected: true } when the presented token is already
     * rotated/revoked — the caller must write an audit log and clear cookies.
     * Throws UnauthorizedException for truly invalid (not-found / expired) tokens.
     */
    async rotateRefreshToken(rawToken: string, ctx: RefreshContext): Promise<RotateRefreshResult> {
        const tokenHash = this.hashRefreshToken(rawToken);
        const repo = this.systemDataSource.getRepository(RefreshToken);

        const existing = await repo.findOne({ where: { tokenHash } });

        if (!existing) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Reuse / revocation attack → revoke entire family
        if (existing.status === 'rotated' || existing.status === 'revoked') {
            await this.revokeFamilyInternal(repo, existing.familyId);
            return { reuseDetected: true };
        }

        // Check expiry
        if (existing.expiresAt < new Date()) {
            throw new UnauthorizedException('Refresh token has expired');
        }

        // Check absolute session TTL
        const { sessionAbsoluteTtlDays, refreshTokenTtlDays } = this.getAuthConfig();
        const absoluteDeadline = new Date(
            existing.createdAt.getTime() + sessionAbsoluteTtlDays * 24 * 60 * 60 * 1000,
        );
        if (new Date() > absoluteDeadline) {
            throw new UnauthorizedException('Session has expired — please sign in again');
        }

        // Load the user to issue the new access token embedded in the returned session
        const userRepo = this.systemDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: existing.userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Issue new token in the same family/session
        const rawNew = randomBytes(32).toString('base64url');
        const newHash = this.hashRefreshToken(rawNew);
        const expiresAt = new Date(Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000);

        const newRow = repo.create({
            userId: user.id,
            familyId: existing.familyId,
            tokenHash: newHash,
            sessionId: existing.sessionId,
            status: 'active',
            replacedById: null,
            userAgent: ctx.userAgent ?? existing.userAgent,
            ip: ctx.ip ?? existing.ip,
            expiresAt,
        });
        await repo.save(newRow);

        // Mark old token as rotated, linking to the new row
        await repo.update(existing.id, {
            status: 'rotated',
            replacedById: newRow.id,
        });

        return {
            rawToken: rawNew,
            familyId: existing.familyId,
            sessionId: existing.sessionId,
            expiresAt,
            reuseDetected: false,
        };
    }

    /**
     * Revokes all active/rotated tokens in the given refresh-token family.
     * Used internally on reuse detection, and exported for auth controller use.
     */
    private async revokeFamilyInternal(
        repo: ReturnType<SystemDataSource['getRepository']>,
        familyId: string,
    ): Promise<void> {
        // Raw query to update all rows matching familyId in one statement.
        // Double-quotes required because familyId is camelCase in the system schema.
        await this.systemDataSource.getDataSource().query(
            `UPDATE refresh_tokens SET status = 'revoked' WHERE "familyId" = $1 AND status != 'revoked'`,
            [familyId],
        );
    }

    /**
     * Revokes all tokens belonging to a specific session (logout from one device).
     */
    async revokeSession(sessionId: string): Promise<void> {
        await this.systemDataSource.getDataSource().query(
            `UPDATE refresh_tokens SET status = 'revoked' WHERE "sessionId" = $1 AND status != 'revoked'`,
            [sessionId],
        );
    }

    /**
     * Revokes all tokens for a user across all families and sessions
     * (logout everywhere / forced logout by admin).
     */
    async revokeAllUserSessions(userId: string): Promise<void> {
        await this.systemDataSource.getDataSource().query(
            `UPDATE refresh_tokens SET status = 'revoked' WHERE "userId" = $1 AND status != 'revoked'`,
            [userId],
        );
    }
}
