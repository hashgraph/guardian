import {
    Injectable,
    Logger,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemDataSource } from '@api/database/system-database.module';
import { RedisService } from '@shared/redis/redis.service';
import { User } from '@shared/entities/auth/user.entity';
import { AuditLog } from '@shared/entities/auth/audit-log.entity';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { MailService } from '../mail/mail.service';
import type { AuthenticatedUser, AppRole } from '../auth/auth.types';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminListUsersQueryDto } from './dto/admin-users.dto';

/** Safe user shape returned to admins — never includes passwordHash / tokenVersion. */
export interface SafeUser {
    id: string;
    email: string;
    role: AppRole;
    isActive: boolean;
    firstName: string | null;
    lastName: string | null;
    organisation: string | null;
    jobTitle: string | null;
    country: string | null;
    emailVerifiedAt: Date | null;
    mustChangePassword: boolean;
    apiQuotaPerHour: number | null;
    createdAt: Date;
}

export interface AdminUserListResult {
    data: SafeUser[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    counts: { active: number; inactive: number; total: number };
}

const SAFE_COLUMNS =
    'id, email, role, "isActive", "firstName", "lastName", organisation, "jobTitle", country, "emailVerifiedAt", "mustChangePassword", "apiQuotaPerHour", "createdAt"';

/**
 * Admin-only user-management operations.
 *
 * Security invariants:
 *  - Caller is already proven to be an admin by @Roles('admin') + RolesGuard.
 *  - The last active admin can never be deactivated, demoted, or self-removed.
 *  - Deactivation / demotion takes effect immediately: refresh sessions are
 *    revoked and the JwtAuthGuard's live isActive/role check rejects the next
 *    request. Demotion also bumps tokenVersion so outstanding access tokens die.
 *  - No mass-assignment: fields are mapped explicitly; role is enum-validated.
 *  - passwordHash / tokenVersion are never returned.
 */
@Injectable()
export class AdminUsersService {
    private readonly logger = new Logger(AdminUsersService.name);

    constructor(
        private readonly systemDataSource: SystemDataSource,
        private readonly redis: RedisService,
        private readonly passwordService: PasswordService,
        private readonly tokenService: TokenService,
        private readonly config: ConfigService,
        private readonly mailService: MailService,
    ) {}

    private maxQuota(): number {
        return this.config.get<number>('app.rateLimit.maxQuota') ?? 10000;
    }

    // ── list ────────────────────────────────────────────────────────────────
    async list(query: AdminListUsersQueryDto): Promise<AdminUserListResult> {
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const offset = (page - 1) * limit;

        const search = query.search?.trim() ? `%${query.search.trim()}%` : null;
        const role = query.role ?? null;
        const isActive = query.status ? query.status === 'active' : null;
        const verifiedFlag = query.verified ? (query.verified === 'verified') : null;

        const ds = this.systemDataSource.getDataSource();

        // Filtered page + total (parameterised; ::type casts let null params skip the clause)
        const where = `
            WHERE ($1::text IS NULL OR email ILIKE $1 OR "firstName" ILIKE $1 OR "lastName" ILIKE $1)
              AND ($2::text IS NULL OR role = $2)
              AND ($3::boolean IS NULL OR "isActive" = $3)
              AND ($4::boolean IS NULL OR ("emailVerifiedAt" IS NOT NULL) = $4)`;

        const rows = await ds.query<SafeUser[]>(
            `SELECT ${SAFE_COLUMNS} FROM users ${where}
             ORDER BY "createdAt" DESC LIMIT $5 OFFSET $6`,
            [search, role, isActive, verifiedFlag, limit, offset],
        );

        const totalRows = await ds.query<{ c: number }[]>(
            `SELECT count(*)::int AS c FROM users ${where}`,
            [search, role, isActive, verifiedFlag],
        );
        const total = totalRows[0]?.c ?? 0;

        // Global active/inactive counts (independent of the page filters)
        const countRows = await ds.query<{ active: number; inactive: number; total: number }[]>(
            `SELECT
                count(*) FILTER (WHERE "isActive")::int      AS active,
                count(*) FILTER (WHERE NOT "isActive")::int  AS inactive,
                count(*)::int                                AS total
             FROM users`,
        );
        const counts = countRows[0] ?? { active: 0, inactive: 0, total: 0 };

        return {
            data: rows,
            meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
            counts,
        };
    }

    // ── create ──────────────────────────────────────────────────────────────
    async create(dto: AdminCreateUserDto, actor: AuthenticatedUser): Promise<SafeUser> {
        const email = dto.email.toLowerCase().trim();
        const repo = this.systemDataSource.getRepository(User);

        const existing = await repo.findOne({ where: { email } });
        if (existing) {
            throw new ConflictException('A user with this email address already exists');
        }

        const passwordHash = await this.passwordService.hash(dto.password);

        // Explicit field mapping — never spread the DTO.
        // Admin-created accounts are trusted: active + email pre-verified, but must
        // change the admin-set password on first login.
        const user = repo.create({
            email,
            passwordHash,
            role: dto.role,
            isActive: true,
            emailVerifiedAt: new Date(),
            mustChangePassword: true,
            firstName: dto.firstName ?? null,
            lastName: dto.lastName ?? null,
            organisation: dto.organisation ?? null,
            jobTitle: dto.jobTitle ?? null,
            country: dto.country ?? null,
        });
        await repo.save(user);

        await this.audit('admin.user_create', actor, user.id, { role: dto.role });

        // Best-effort welcome email — never fail the create on SMTP error.
        try {
            void this.mailService.sendWelcomeEmail(
                user.email,
                (process.env.APP_PUBLIC_URL ?? '').replace(/\/$/, ''),
                [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`admin create-user welcome email failed for user ${user.id}: ${msg}`);
        }

        return this.toSafe(user);
    }

    // ── setStatus (activate / deactivate) ─────────────────────────────────────
    async setStatus(id: string, isActive: boolean, actor: AuthenticatedUser): Promise<SafeUser> {
        const target = await this.getUserOr404(id);

        if (!isActive) {
            this.assertNotSelf(target, actor, 'deactivate');
            // Lock the OTHER active admins and refuse if this would remove the last one.
            await this.runLastAdminGuardedUpdate(target, () =>
                this.systemDataSource.getDataSource().query(
                    `UPDATE users SET "isActive" = false, "updatedAt" = now() WHERE id = $1`,
                    [id],
                ),
            );
            // Immediate effect: kill refresh sessions (access tokens die via the
            // guard's live isActive check on the next request).
            await this.tokenService.revokeAllUserSessions(id);
            // Invalidate the authz cache so RolesGuard picks up the deactivation
            // immediately on the very next role-restricted request.
            void this.redis.del(`authz:user:${id}`);

            // Best-effort deactivation notice — never fail the setStatus call on SMTP error.
            try {
                void this.mailService.sendDeactivationEmail(
                    target.email,
                    [target.firstName, target.lastName].filter(Boolean).join(' ').trim(),
                );
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.error(`admin deactivate-user email failed for user ${id}: ${msg}`);
            }
        } else {
            await this.systemDataSource.getDataSource().query(
                `UPDATE users SET "isActive" = true, "updatedAt" = now() WHERE id = $1`,
                [id],
            );
            // Invalidate the authz cache so RolesGuard picks up the reactivation immediately.
            void this.redis.del(`authz:user:${id}`);

            // Best-effort reactivation notice — never fail the setStatus call on SMTP error.
            try {
                void this.mailService.sendReactivationEmail(
                    target.email,
                    (process.env.APP_PUBLIC_URL ?? '').replace(/\/$/, ''),
                    [target.firstName, target.lastName].filter(Boolean).join(' ').trim(),
                );
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.error(`admin reactivate-user email failed for user ${id}: ${msg}`);
            }
        }

        await this.audit(isActive ? 'admin.user_activate' : 'admin.user_deactivate', actor, id);
        return this.toSafe(await this.getUserOr404(id));
    }

    // ── setRole ───────────────────────────────────────────────────────────────
    async setRole(id: string, role: AppRole, actor: AuthenticatedUser): Promise<SafeUser> {
        const target = await this.getUserOr404(id);

        if (role === target.role) {
            return this.toSafe(target); // no-op
        }

        const demoting = target.role === 'admin' && role === 'system_user';
        if (demoting) {
            this.assertNotSelf(target, actor, 'demote');
            await this.runLastAdminGuardedUpdate(target, () =>
                this.systemDataSource.getDataSource().query(
                    `UPDATE users SET role = $1, "tokenVersion" = "tokenVersion" + 1, "updatedAt" = now() WHERE id = $2`,
                    [role, id],
                ),
            );
        } else {
            // Promotion (or lateral) — bump tokenVersion so the new role takes full
            // effect on a fresh session and revoke old sessions.
            await this.systemDataSource.getDataSource().query(
                `UPDATE users SET role = $1, "tokenVersion" = "tokenVersion" + 1, "updatedAt" = now() WHERE id = $2`,
                [role, id],
            );
        }

        // Force re-authentication so the new role is reflected everywhere.
        await this.tokenService.revokeAllUserSessions(id);
        // Invalidate the authz cache so RolesGuard picks up the new role immediately.
        void this.redis.del(`authz:user:${id}`);

        await this.audit('admin.user_role_change', actor, id, { role });
        return this.toSafe(await this.getUserOr404(id));
    }

    // ── setQuota (admin sets / reduces a user's rate-limit quota) ──────────────
    /**
     * Sets a user's per-hour API quota to an admin-chosen value (typically a
     * reduction). The quota is clamped to [1, maxQuota]; the justification is
     * required and recorded in the audit log alongside the previous value.
     * apiQuotaPerHour is GLOBAL per user (not per-network).
     */
    async setQuota(
        id: string,
        quota: number,
        justification: string,
        actor: AuthenticatedUser,
    ): Promise<SafeUser> {
        const target = await this.getUserOr404(id);
        // Direct self-set is intentionally allowed (and audited): unlike the
        // rate-limit REQUEST workflow (which forbids self-approval), this is a
        // direct admin control and grants no privilege escalation — an admin can
        // already set any user's quota up to maxQuota.
        const newQuota = Math.min(Math.max(1, Math.trunc(quota)), this.maxQuota());

        await this.systemDataSource.getDataSource().query(
            `UPDATE users SET "apiQuotaPerHour" = $1, "updatedAt" = now() WHERE id = $2`,
            [newQuota, id],
        );
        // Invalidate the authz cache so any stale entry for this user is flushed.
        void this.redis.del(`authz:user:${id}`);

        await this.audit('admin.rate_limit_set', actor, id, {
            previousQuota: target.apiQuotaPerHour,
            newQuota,
            justification: justification.trim(),
        });
        return this.toSafe(await this.getUserOr404(id));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Prevents an admin from deactivating/demoting their own account. */
    private assertNotSelf(target: User, actor: AuthenticatedUser, action: string): void {
        if (target.id === actor.id) {
            throw new ForbiddenException(`You cannot ${action} your own administrator account`);
        }
    }

    /**
     * Runs `update` inside a transaction that first locks the OTHER active admin
     * rows (FOR UPDATE) and refuses if none remain — closing the concurrent
     * "two admins demote each other" race deterministically.
     */
    private async runLastAdminGuardedUpdate(
        target: User,
        update: () => Promise<unknown>,
    ): Promise<void> {
        if (target.role !== 'admin') {
            await update();
            return;
        }
        await this.systemDataSource.getDataSource().transaction(async (manager) => {
            const others = await manager.query(
                `SELECT id FROM users WHERE role = 'admin' AND "isActive" = true AND id <> $1 FOR UPDATE`,
                [target.id],
            );
            if (others.length === 0) {
                throw new ConflictException('Cannot remove the last active administrator');
            }
            await update();
        });
    }

    private async getUserOr404(id: string): Promise<User> {
        const user = await this.systemDataSource.getRepository(User).findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    private toSafe(u: User): SafeUser {
        return {
            id: u.id,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            firstName: u.firstName,
            lastName: u.lastName,
            organisation: u.organisation,
            jobTitle: u.jobTitle,
            country: u.country,
            emailVerifiedAt: u.emailVerifiedAt,
            mustChangePassword: u.mustChangePassword,
            apiQuotaPerHour: u.apiQuotaPerHour,
            createdAt: u.createdAt,
        };
    }

    /** Best-effort audit write — never converts a successful admin action into a 500. */
    private async audit(
        action: string,
        actor: AuthenticatedUser,
        targetId: string,
        detail?: Record<string, unknown>,
    ): Promise<void> {
        try {
            const repo = this.systemDataSource.getRepository(AuditLog);
            await repo.save(repo.create({
                action,
                outcome: 'success',
                actorUserId: actor.id,
                targetType: 'user',
                targetId,
                network: null,
                ip: null,
                userAgent: null,
                detail: detail ?? null,
            }));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`audit_log write failed [action=${action}]: ${msg}`);
        }
    }
}
