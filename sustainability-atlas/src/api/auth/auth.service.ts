import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { SystemDataSource } from '@api/database/system-database.module';
import { User } from '@shared/entities/auth/user.entity';
import { AuditLog } from '@shared/entities/auth/audit-log.entity';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { MailService } from '../mail/mail.service';
import { EmailTokenService } from './email-token.service';
import { MailQueueProducer } from '../mail/mail-queue/mail-queue.producer';
import { MailJobData } from '../mail/mail-queue/mail-queue.constants';
import { setAuthCookies, clearAuthCookies, CookieWriter } from './cookie.util';
import { AuthenticatedUser, CookieConfig } from './auth.types';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// ── Request context ──────────────────────────────────────────────────────────

export interface RequestCtx {
    ip: string | null;
    userAgent: string | null;
}

// ── Safe user profile (returned on login / me) ───────────────────────────────

export interface AuthUserProfile {
    id: string;
    email: string;
    role: 'system_user' | 'admin';
    firstName: string | null;
    lastName: string | null;
    organisation: string | null;
    jobTitle: string | null;
    country: string | null;
    emailVerifiedAt: Date | null;
    mustChangePassword: boolean;
    createdAt: Date;
}

// ── Account activity (audit_log rows for the signed-in user) ─────────────────

export interface ActivityItem {
    id: string;
    action: string;
    outcome: string;
    ip: string | null;
    createdAt: Date;
}

export interface MyActivityResult {
    items: ActivityItem[];
    total: number;
    page: number;
    pageSize: number;
    /** Distinct action types this user has, for the filter dropdown. */
    actions: string[];
}

// ── Generic error message (constant-time, enumeration-safe) ──────────────────

const INVALID_CREDENTIALS = 'Invalid email or password';

// ── AuthService ───────────────────────────────────────────────────────────────

/**
 * Orchestrates all authentication flows.
 *
 * Security invariants enforced here:
 *  - Lowercase email on every persist/lookup.
 *  - Never reveal whether an email is registered (generic errors, neutral 200s).
 *  - dummyVerify on unknown-email to equalize timing.
 *  - Per-account lockout via failedLoginCount / lockedUntil.
 *  - Explicit field mapping (never spread DTO onto entity).
 *  - Audit writes wrapped best-effort (never convert success → 500).
 *  - Cookie flags read from ConfigService (cookieDomain/cookieSameSite/cookieSecure).
 */
@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly systemDataSource: SystemDataSource,
        private readonly passwordService: PasswordService,
        private readonly tokenService: TokenService,
        private readonly mailService: MailService,
        private readonly emailTokenService: EmailTokenService,
        private readonly config: ConfigService,
        private readonly mailQueue: MailQueueProducer,
    ) {}

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Builds CookieConfig from application configuration. */
    private getCookieConfig(): CookieConfig {
        const auth = this.config.get<{
            cookieDomain: string;
            cookieSameSite: string;
            cookieSecure: boolean;
            accessTokenTtlMinutes: number;
            refreshTokenTtlDays: number;
        }>('app.auth')!;

        return {
            domain: auth.cookieDomain || undefined,
            sameSite: (auth.cookieSameSite as 'Lax' | 'Strict' | 'None') || 'Lax',
            secure: auth.cookieSecure,
            accessMaxAgeMs: auth.accessTokenTtlMinutes * 60 * 1000,
            refreshMaxAgeMs: auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
        };
    }

    /** Maps a User row to the safe profile shape returned to clients. */
    private toProfile(user: User): AuthUserProfile {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            organisation: user.organisation,
            jobTitle: user.jobTitle,
            country: user.country,
            emailVerifiedAt: user.emailVerifiedAt,
            mustChangePassword: user.mustChangePassword,
            createdAt: user.createdAt,
        };
    }

    /**
     * Best-effort audit log write. A failure here must NEVER convert a successful
     * auth action into a 500 — wrap and swallow.
     */
    private async audit(
        action: string,
        outcome: 'success' | 'failure',
        ctx: RequestCtx,
        opts?: {
            actorUserId?: string | null;
            targetType?: string;
            targetId?: string;
            detail?: Record<string, unknown>;
        },
    ): Promise<void> {
        try {
            const repo = this.systemDataSource.getRepository(AuditLog);
            const row = repo.create({
                action,
                outcome,
                actorUserId: opts?.actorUserId ?? null,
                targetType: opts?.targetType ?? null,
                targetId: opts?.targetId ?? null,
                network: null,
                ip: ctx.ip,
                userAgent: ctx.userAgent,
                detail: opts?.detail ?? null,
            });
            await repo.save(row);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`audit_log write failed [action=${action}]: ${msg}`);
        }
    }

    /**
     * Routes a transactional email through the BullMQ queue when enabled
     * (MAIL_QUEUE_ENABLED=true), falling back to the existing fire-and-forget
     * inline path when the queue is disabled or unreachable.
     * Never throws — matches the error-swallowing contract of the surrounding
     * try/catch blocks that call it.
     */
    private async dispatchEmail(data: MailJobData): Promise<void> {
        const queued = await this.mailQueue.enqueue(data);
        if (queued) return;
        switch (data.kind) {
            case 'verify':
                void this.mailService.sendVerificationEmail(data.to, data.link, data.name);
                break;
            case 'reset':
                void this.mailService.sendPasswordResetEmail(data.to, data.link, data.name, data.expiry);
                break;
            case 'welcome':
                void this.mailService.sendWelcomeEmail(data.to, data.link, data.name);
                break;
            case 'deactivated':
                void this.mailService.sendDeactivationEmail(data.to, data.name);
                break;
        }
    }

    // ── signup ────────────────────────────────────────────────────────────────

    /**
     * Self-service user registration.
     *
     * Returns the same neutral 200 whether the email is new or already taken —
     * prevents account enumeration. The verification email is only sent for new
     * accounts; duplicate-email attempts silently no-op.
     */
    async signup(dto: SignUpDto, ctx: RequestCtx): Promise<{ message: string }> {
        const email = dto.email.toLowerCase().trim();

        const userRepo = this.systemDataSource.getRepository(User);

        // Hash BEFORE the existence check so the duplicate-email path pays the same
        // argon2 cost — closes a signup timing side-channel (mirrors login's dummyVerify).
        const passwordHash = await this.passwordService.hash(dto.password);

        // Check for existing account — don't reveal existence
        const existing = await userRepo.findOne({ where: { email } });

        if (!existing) {
            // Explicit field mapping — NEVER spread dto or include privileged fields
            const user = userRepo.create({
                email,
                passwordHash,
                role: 'system_user',
                isActive: true,
                emailVerifiedAt: null,
                mustChangePassword: false,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                organisation: dto.organisation?.trim() ?? null,
                jobTitle: dto.jobTitle?.trim() ?? null,
                country: dto.country.trim(),
            });
            try {
                await userRepo.save(user);
            } catch (err: unknown) {
                // Concurrent duplicate email (UQ_users_email, PG 23505) — return the
                // SAME neutral response and send no email (preserves anti-enumeration
                // even in the findOne→save race). Anything else is a real error.
                if ((err as { code?: string })?.code === '23505') {
                    return { message: 'If this email address is not registered, a verification email has been sent.' };
                }
                throw err;
            }

            // Issue email-verification token and send both welcome + verify emails (best-effort)
            try {
                const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                const loginLink = (process.env.APP_PUBLIC_URL ?? '').replace(/\/$/, '');
                void this.dispatchEmail({ kind: 'welcome', to: email, link: loginLink, name: displayName });
                const rawToken = await this.emailTokenService.issueToken(user.id, 'verify');
                const link = this.emailTokenService.buildVerificationLink(rawToken);
                // Fire-and-forget — never block the response on SMTP (avoids 502s).
                void this.dispatchEmail({ kind: 'verify', to: email, link, name: displayName });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.error(`signup email send failed for user ${user.id}: ${msg}`);
            }

            await this.audit('auth.signup', 'success', ctx, {
                actorUserId: user.id,
                targetType: 'user',
                targetId: user.id,
            });
        }

        // Same response regardless — no account-existence leak
        return { message: 'If this email address is not registered, a verification email has been sent.' };
    }

    // ── verifyEmail ───────────────────────────────────────────────────────────

    /**
     * Consumes the single-use email-verification token and activates the account.
     * Returns a generic error on invalid/expired/already-used tokens.
     */
    async verifyEmail(dto: VerifyEmailDto, ctx: RequestCtx): Promise<{ message: string }> {
        const userId = await this.emailTokenService.consumeToken(dto.token, 'verify');

        if (!userId) {
            throw new UnauthorizedException('Invalid or expired verification token');
        }

        const userRepo = this.systemDataSource.getRepository(User);
        await userRepo.update(userId, { emailVerifiedAt: new Date() });

        await this.audit('auth.email_verify', 'success', ctx, {
            actorUserId: userId,
            targetType: 'user',
            targetId: userId,
        });

        return { message: 'Email address verified. You can now sign in.' };
    }

    // ── resendVerification ──────────────────────────────────────────────────────

    /**
     * Re-sends the email-verification link for the signed-in user, THROTTLED so a
     * fresh email isn't sent on every click. If a verify token was issued within
     * the cooldown window, returns sent=false with the remaining wait so the UI can
     * show "already sent — check your mailbox"; once the cooldown passes (or the
     * previous link expired) a new email is sent.
     */
    async resendVerification(
        actor: AuthenticatedUser,
        ctx: RequestCtx,
    ): Promise<{ sent: boolean; message: string; retryAfterSeconds?: number }> {
        const userRepo = this.systemDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: actor.id } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        if (user.emailVerifiedAt) {
            return { sent: false, message: 'Your email address is already verified.' };
        }

        const cooldownSeconds = this.config.get<number>('app.auth.resendVerificationCooldownSeconds') ?? 300;

        // Throttle on the most recent verify token's creation time.
        const rows = await this.systemDataSource.getDataSource().query<{ createdAt: Date }[]>(
            `SELECT "createdAt" FROM auth_email_tokens
              WHERE "userId" = $1 AND type = 'verify'
              ORDER BY "createdAt" DESC LIMIT 1`,
            [user.id],
        );
        if (rows.length > 0) {
            const elapsedMs = Date.now() - new Date(rows[0].createdAt).getTime();
            const cooldownMs = cooldownSeconds * 1000;
            if (elapsedMs < cooldownMs) {
                return {
                    sent: false,
                    message: 'A verification email was sent recently. Please check your mailbox.',
                    retryAfterSeconds: Math.ceil((cooldownMs - elapsedMs) / 1000),
                };
            }
        }

        try {
            const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
            const rawToken = await this.emailTokenService.issueToken(user.id, 'verify');
            const link = this.emailTokenService.buildVerificationLink(rawToken);
            // Fire-and-forget — never block the response on SMTP (avoids 502s).
            void this.dispatchEmail({ kind: 'verify', to: user.email, link, name: displayName });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`resend verification email failed for user ${user.id}: ${msg}`);
        }

        await this.audit('auth.resend_verification', 'success', ctx, {
            actorUserId: user.id,
            targetType: 'user',
            targetId: user.id,
        });

        return { sent: true, message: 'Verification email sent. Please check your mailbox.' };
    }

    // ── login ─────────────────────────────────────────────────────────────────

    /**
     * Session login. Sets access + refresh + csrf cookies on the response.
     *
     * All failure paths return the same generic error message to prevent
     * account enumeration. Timing is equalized via dummyVerify on unknown email.
     */
    async login(
        dto: LoginDto,
        ctx: RequestCtx,
        res: CookieWriter,
    ): Promise<AuthUserProfile> {
        const email = dto.email.toLowerCase().trim();
        const userRepo = this.systemDataSource.getRepository(User);

        const user = await userRepo.findOne({ where: { email } });

        if (!user) {
            // Equalize timing — prevents enumeration via response time
            await this.passwordService.dummyVerify(dto.password);
            await this.audit('auth.login', 'failure', ctx, {
                detail: { reason: 'user_not_found', email },
            });
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        // Per-account lockout check
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            await this.audit('auth.login', 'failure', ctx, {
                actorUserId: user.id,
                targetType: 'user',
                targetId: user.id,
                detail: { reason: 'account_locked' },
            });
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        // Password verification
        const passwordValid = await this.passwordService.verify(user.passwordHash, dto.password);

        if (!passwordValid) {
            // Increment lockout counter
            const rateLimit = this.config.get<{ loginMaxFailures: number; loginLockMinutes: number }>('app.rateLimit')!;
            const newCount = user.failedLoginCount + 1;
            const shouldLock = newCount >= rateLimit.loginMaxFailures;
            const lockedUntil = shouldLock
                ? new Date(Date.now() + rateLimit.loginLockMinutes * 60 * 1000)
                : null;

            await userRepo.update(user.id, {
                failedLoginCount: newCount,
                ...(shouldLock ? { lockedUntil } : {}),
            });

            await this.audit('auth.login', 'failure', ctx, {
                actorUserId: user.id,
                targetType: 'user',
                targetId: user.id,
                detail: { reason: 'wrong_password', failedLoginCount: newCount, locked: shouldLock },
            });
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        // Unverified users MAY sign in — a verification banner nudges them in the
        // UI (resend is throttled). Only DEACTIVATED accounts are blocked here.
        if (!user.isActive) {
            await this.audit('auth.login', 'failure', ctx, { actorUserId: user.id, targetType: 'user', targetId: user.id, detail: { reason: 'account_inactive' } });
            throw new UnauthorizedException('Your account has been deactivated. Please contact an administrator.');
        }

        // Reset lockout counters on successful login
        await userRepo.update(user.id, {
            failedLoginCount: 0,
            lockedUntil: null,
        });

        // Issue tokens
        const issued = await this.tokenService.issueRefreshToken(user, {
            ip: ctx.ip,
            userAgent: ctx.userAgent,
        });
        const accessToken = await this.tokenService.signAccessToken(user, issued.sessionId);
        const csrfToken = randomBytes(24).toString('base64url');

        const cfg = this.getCookieConfig();
        setAuthCookies(res, { access: accessToken, refresh: issued.rawToken, csrf: csrfToken }, cfg);

        await this.audit('auth.login', 'success', ctx, {
            actorUserId: user.id,
            targetType: 'user',
            targetId: user.id,
            detail: { sessionId: issued.sessionId },
        });

        return this.toProfile(user);
    }

    // ── refresh ───────────────────────────────────────────────────────────────

    /**
     * Rotates the refresh token and reissues access + refresh + csrf cookies.
     *
     * On reuse-detection (rotated token presented): revokes the whole family,
     * clears cookies, writes audit, and throws 401.
     */
    async refresh(
        rawRefresh: string,
        ctx: RequestCtx,
        res: CookieWriter,
    ): Promise<{ message: string }> {
        const result = await this.tokenService.rotateRefreshToken(rawRefresh, {
            ip: ctx.ip,
            userAgent: ctx.userAgent,
        });

        if ('reuseDetected' in result && result.reuseDetected) {
            // Reuse attack — clear cookies and 401
            const cfg = this.getCookieConfig();
            clearAuthCookies(res, cfg);

            await this.audit('auth.refresh_reuse', 'failure', ctx, {
                detail: { reason: 'refresh_token_reuse_detected' },
            });

            throw new UnauthorizedException('Session invalidated — please sign in again');
        }

        // rotateRefreshToken returns the new token's sessionId. We resolve the user
        // from the active refresh_tokens row for that session so we can sign a new
        // access JWT without re-implementing the userId lookup inside TokenService.
        const { rawToken: newRawRefresh, sessionId } = result as {
            rawToken: string;
            sessionId: string;
            familyId: string;
            expiresAt: Date;
            reuseDetected?: false;
        };

        // Load the user from the new refresh_tokens row by sessionId
        const freshUser = await this.resolveUserBySessionId(sessionId);
        if (!freshUser || !freshUser.isActive) {
            const cfg = this.getCookieConfig();
            clearAuthCookies(res, cfg);
            throw new UnauthorizedException('Session invalid');
        }

        const accessToken = await this.tokenService.signAccessToken(freshUser, sessionId);
        const csrfToken = randomBytes(24).toString('base64url');

        const cfg = this.getCookieConfig();
        setAuthCookies(res, { access: accessToken, refresh: newRawRefresh, csrf: csrfToken }, cfg);

        return { message: 'Token refreshed' };
    }

    /**
     * Resolves a User by matching a refresh_tokens.sessionId row.
     * Used only in the refresh flow to get the user after rotation.
     */
    private async resolveUserBySessionId(sessionId: string): Promise<User | null> {
        const rows = await this.systemDataSource.getDataSource().query<{ userId: string }[]>(
            `SELECT "userId" FROM refresh_tokens WHERE "sessionId" = $1 AND status = 'active' LIMIT 1`,
            [sessionId],
        );
        if (rows.length === 0) return null;
        const userRepo = this.systemDataSource.getRepository(User);
        return userRepo.findOne({ where: { id: rows[0].userId } });
    }

    // ── logout ────────────────────────────────────────────────────────────────

    /**
     * Revokes the current session and clears all auth cookies.
     */
    async logout(
        user: AuthenticatedUser,
        res: CookieWriter,
        ctx: RequestCtx,
    ): Promise<{ message: string }> {
        if (user.sessionId) {
            await this.tokenService.revokeSession(user.sessionId);
        }

        const cfg = this.getCookieConfig();
        clearAuthCookies(res, cfg);

        await this.audit('auth.logout', 'success', ctx, {
            actorUserId: user.id,
            targetType: 'user',
            targetId: user.id,
            detail: { sessionId: user.sessionId },
        });

        return { message: 'Logged out successfully' };
    }

    // ── me ────────────────────────────────────────────────────────────────────

    /**
     * Returns the safe profile for the currently authenticated user.
     * Loads a fresh row from the DB to reflect any recent profile changes.
     */
    async me(user: AuthenticatedUser): Promise<AuthUserProfile> {
        const userRepo = this.systemDataSource.getRepository(User);
        const fresh = await userRepo.findOne({ where: { id: user.id } });
        if (!fresh) {
            throw new UnauthorizedException('User not found');
        }
        return this.toProfile(fresh);
    }

    // ── updateProfile ───────────────────────────────────────────────────────────

    /**
     * Updates the signed-in user's OWN editable profile fields (name,
     * organisation, job title, country). Email and role are NOT mutable here —
     * those fields are not on UpdateProfileDto and forbidNonWhitelisted rejects
     * them. Only fields actually present in the DTO are changed (explicit
     * mapping — never spread the DTO). An empty string OR null clears the
     * nullable field (note: class-validator's @IsOptional skips validation for
     * null too, so we must tolerate null here — `null?.trim()` → undefined →
     * null). Returns the refreshed profile.
     */
    async updateProfile(
        actor: AuthenticatedUser,
        dto: UpdateProfileDto,
        ctx: RequestCtx,
    ): Promise<AuthUserProfile> {
        const userRepo = this.systemDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: actor.id } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (dto.firstName !== undefined) user.firstName = dto.firstName?.trim() || null;
        if (dto.lastName !== undefined) user.lastName = dto.lastName?.trim() || null;
        if (dto.organisation !== undefined) user.organisation = dto.organisation?.trim() || null;
        if (dto.jobTitle !== undefined) user.jobTitle = dto.jobTitle?.trim() || null;
        if (dto.country !== undefined) user.country = dto.country?.trim() || null;

        await userRepo.save(user);

        await this.audit('auth.update_profile', 'success', ctx, {
            actorUserId: user.id,
            targetType: 'user',
            targetId: user.id,
        });

        return this.toProfile(user);
    }

    // ── getMyActivity ───────────────────────────────────────────────────────────

    /**
     * Returns the signed-in user's OWN recent activity (audit_log rows), paginated
     * and optionally filtered by action type. Strictly scoped to actorUserId =
     * the caller (IDOR-safe — never reads another user's audit trail). Also returns
     * the distinct action types the user has, to populate the filter dropdown.
     */
    async getMyActivity(
        user: AuthenticatedUser,
        pageRaw?: number,
        pageSizeRaw?: number,
        action?: string,
    ): Promise<MyActivityResult> {
        const page = pageRaw && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
        const pageSize = pageSizeRaw && pageSizeRaw > 0 ? Math.min(Math.trunc(pageSizeRaw), 100) : 10;
        const offset = (page - 1) * pageSize;
        const act = action?.trim() || null;

        const ds = this.systemDataSource.getDataSource();
        // ::text cast lets a null `act` skip the action filter in one parameterised query.
        const where = `WHERE "actorUserId" = $1 AND ($2::text IS NULL OR action = $2)`;

        const items = await ds.query<ActivityItem[]>(
            `SELECT id::text AS id, action, outcome, ip, "createdAt"
               FROM audit_log ${where}
              ORDER BY "createdAt" DESC LIMIT $3 OFFSET $4`,
            [user.id, act, pageSize, offset],
        );

        const totalRows = await ds.query<{ c: number }[]>(
            `SELECT count(*)::int AS c FROM audit_log ${where}`,
            [user.id, act],
        );
        const total = totalRows[0]?.c ?? 0;

        const actionRows = await ds.query<{ action: string }[]>(
            `SELECT DISTINCT action FROM audit_log WHERE "actorUserId" = $1 ORDER BY action`,
            [user.id],
        );

        return { items, total, page, pageSize, actions: actionRows.map((r) => r.action) };
    }

    // ── forgotPassword ────────────────────────────────────────────────────────

    /**
     * Initiates a password-reset flow.
     * ALWAYS returns neutral 200 — never reveals whether the email is registered.
     */
    async forgotPassword(dto: ForgotPasswordDto, ctx: RequestCtx): Promise<{ message: string }> {
        const email = dto.email.toLowerCase().trim();
        const userRepo = this.systemDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { email } });

        if (user) {
            try {
                const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                const rawToken = await this.emailTokenService.issueToken(user.id, 'reset');
                const link = this.emailTokenService.buildResetLink(rawToken);
                // Fire-and-forget — never block the response on SMTP (avoids 502s).
                void this.dispatchEmail({ kind: 'reset', to: email, link, name: displayName, expiry: '1 hour' });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.error(`forgot-password email failed for user ${user.id}: ${msg}`);
            }

            await this.audit('auth.forgot_password', 'success', ctx, {
                actorUserId: user.id,
                targetType: 'user',
                targetId: user.id,
            });
        }

        // Same neutral response regardless of whether the user exists
        return { message: 'If an account with that email address exists, a password-reset link has been sent.' };
    }

    // ── resetPassword ─────────────────────────────────────────────────────────

    /**
     * Consumes a single-use reset token, sets the new password, bumps
     * tokenVersion (invalidates all existing JWTs), and revokes all refresh sessions.
     */
    async resetPassword(dto: ResetPasswordDto, ctx: RequestCtx): Promise<{ message: string }> {
        const userId = await this.emailTokenService.consumeToken(dto.token, 'reset');

        if (!userId) {
            throw new UnauthorizedException('Invalid or expired password-reset token');
        }

        const passwordHash = await this.passwordService.hash(dto.newPassword);

        const userRepo = this.systemDataSource.getRepository(User);

        // Bump tokenVersion to invalidate all existing access JWTs
        await this.systemDataSource.getDataSource().query(
            `UPDATE users SET "passwordHash" = $1, "tokenVersion" = "tokenVersion" + 1, "updatedAt" = now() WHERE id = $2`,
            [passwordHash, userId],
        );

        // Revoke all refresh sessions for this user
        await this.tokenService.revokeAllUserSessions(userId);

        await this.audit('auth.password_reset', 'success', ctx, {
            actorUserId: userId,
            targetType: 'user',
            targetId: userId,
        });

        return { message: 'Password reset successfully. Please sign in with your new password.' };
    }

    // ── changePassword ──────────────────────────────────────────────────────────

    /**
     * Changes the signed-in user's password (used by the forced "must change
     * password" flow for admin-created / seeded accounts, and voluntary changes).
     * Verifies the current password, sets the new one, and clears
     * mustChangePassword. Returns the refreshed profile so the client can update
     * state without a second fetch.
     */
    async changePassword(
        actor: AuthenticatedUser,
        dto: ChangePasswordDto,
        ctx: RequestCtx,
    ): Promise<AuthUserProfile> {
        const userRepo = this.systemDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: actor.id } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const ok = await this.passwordService.verify(user.passwordHash, dto.currentPassword);
        if (!ok) {
            await this.audit('auth.change_password', 'failure', ctx, {
                actorUserId: user.id, targetType: 'user', targetId: user.id,
                detail: { reason: 'wrong_current_password' },
            });
            throw new UnauthorizedException('Current password is incorrect');
        }

        const passwordHash = await this.passwordService.hash(dto.newPassword);
        await this.systemDataSource.getDataSource().query(
            `UPDATE users SET "passwordHash" = $1, "mustChangePassword" = false, "updatedAt" = now() WHERE id = $2`,
            [passwordHash, user.id],
        );

        await this.audit('auth.change_password', 'success', ctx, {
            actorUserId: user.id, targetType: 'user', targetId: user.id,
        });

        const fresh = await userRepo.findOne({ where: { id: user.id } });
        return this.toProfile(fresh ?? user);
    }
}
