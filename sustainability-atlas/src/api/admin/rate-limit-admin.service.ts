import {
    Injectable,
    Logger,
    BadRequestException,
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemDataSource, returningRows } from '@api/database/system-database.module';
import { AuditLog } from '@shared/entities/auth/audit-log.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ResolveRateLimitRequestDto } from './dto/resolve-rate-limit-request.dto';

export interface AdminRateLimitRequestRow {
    id: string;
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    userRole: 'system_user' | 'admin';
    currentQuota: number | null;
    requestedQuota: number;
    justification: string;
    status: 'pending' | 'approved' | 'adjusted' | 'declined';
    approvedQuota: number | null;
    resolvedNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
}

/**
 * Admin-side rate-limit request review.
 *
 * Integrity invariants:
 *  - The applied quota is the admin's approvedQuota, never the requester's value.
 *  - Both requested and approved quotas are clamped to [1, MAX_QUOTA].
 *  - The pending → resolved transition is atomic (UPDATE ... WHERE status='pending'),
 *    so a request can't be resolved twice or raced.
 *  - On approve/adjust the user's apiQuotaPerHour is updated in the SAME transaction.
 */
@Injectable()
export class RateLimitAdminService {
    private readonly logger = new Logger(RateLimitAdminService.name);

    constructor(
        private readonly systemDataSource: SystemDataSource,
        private readonly config: ConfigService,
    ) {}

    private maxQuota(): number {
        return this.config.get<number>('app.rateLimit.maxQuota') ?? 10000;
    }

    async list(status?: 'pending' | 'approved' | 'adjusted' | 'declined'): Promise<AdminRateLimitRequestRow[]> {
        const ds = this.systemDataSource.getDataSource();
        const where = status ? `WHERE r.status = $1` : '';
        return ds.query<AdminRateLimitRequestRow[]>(
            `SELECT r.id, r."userId", u.email, u."firstName", u."lastName", u.role AS "userRole",
                    u."apiQuotaPerHour" AS "currentQuota", r."requestedQuota", r.justification,
                    r.status, r."approvedQuota", r."resolvedNote", r."reviewedAt", r."createdAt"
               FROM rate_limit_requests r
               JOIN users u ON u.id = r."userId"
               ${where}
              ORDER BY (r.status = 'pending') DESC, r."createdAt" DESC`,
            status ? [status] : [],
        );
    }

    async resolve(
        id: string,
        dto: ResolveRateLimitRequestDto,
        actor: AuthenticatedUser,
    ): Promise<AdminRateLimitRequestRow> {
        const ds = this.systemDataSource.getDataSource();
        const max = this.maxQuota();

        const existing = await ds.query<{ status: string; userId: string; requestedQuota: number }[]>(
            `SELECT status, "userId", "requestedQuota" FROM rate_limit_requests WHERE id = $1`,
            [id],
        );
        if (existing.length === 0) {
            throw new NotFoundException('Rate-limit request not found');
        }
        if (existing[0].status !== 'pending') {
            throw new ConflictException('This request has already been resolved');
        }
        // No self-approval — the reviewer must be someone other than the requester.
        if (existing[0].userId === actor.id) {
            throw new ForbiddenException('You cannot resolve your own rate-limit request.');
        }

        // Compute the quota actually granted (admin-controlled; never the raw request).
        let approvedQuota: number | null = null;
        if (dto.decision === 'approved') {
            approvedQuota = Math.min(existing[0].requestedQuota, max);
        } else if (dto.decision === 'adjusted') {
            if (dto.approvedQuota == null) {
                throw new BadRequestException('approvedQuota is required when adjusting a request');
            }
            // Clamp to [1, MAX_QUOTA]. May be lower than requested or current (a reduction).
            approvedQuota = Math.min(Math.max(1, dto.approvedQuota), max);
        }

        const userId = existing[0].userId;

        await ds.transaction(async (m) => {
            const upd = await m.query(
                `UPDATE rate_limit_requests
                    SET status = $1, "approvedQuota" = $2, "reviewerId" = $3,
                        "resolvedNote" = $4, "reviewedAt" = now()
                  WHERE id = $5 AND status = 'pending'
                RETURNING id`,
                [dto.decision, approvedQuota, actor.id, dto.note ?? null, id],
            );
            // UPDATE ... RETURNING returns a [rows, count] tuple on pg — see returningRows().
            if (!returningRows<{ id: string }>(upd)[0]?.id) {
                throw new ConflictException('This request has already been resolved');
            }
            if (approvedQuota != null) {
                await m.query(
                    `UPDATE users SET "apiQuotaPerHour" = $1, "updatedAt" = now() WHERE id = $2`,
                    [approvedQuota, userId],
                );
            }
        });

        await this.audit('admin.rate_limit_resolve', actor, userId, {
            requestId: id,
            decision: dto.decision,
            approvedQuota,
        });

        const refreshed = await this.list();
        return refreshed.find((r) => r.id === id) ?? refreshed[0];
    }

    private async audit(
        action: string,
        actor: AuthenticatedUser,
        targetId: string,
        detail: Record<string, unknown>,
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
                detail,
            }));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`audit_log write failed [action=${action}]: ${msg}`);
        }
    }
}
