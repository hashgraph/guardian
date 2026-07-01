import {
    Injectable,
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemDataSource } from '@api/database/system-database.module';
import { User } from '@shared/entities/auth/user.entity';
import { RateLimitRequest } from '@shared/entities/auth/rate-limit-request.entity';
import type { AuthenticatedUser, AppRole } from '../auth/auth.types';
import { CreateRateLimitRequestDto } from './dto/create-rate-limit-request.dto';

export interface RateLimitRequestRow {
    id: string;
    requestedQuota: number;
    justification: string;
    status: 'pending' | 'approved' | 'adjusted' | 'declined';
    approvedQuota: number | null;
    resolvedNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
}

export interface MyRateLimitSummary {
    data: RateLimitRequestRow[];
    currentQuota: number;
    roleDefault: number;
    maxQuota: number;
    hasPending: boolean;
    /** Whether the rate limiter is actually enforcing. When false, quotas/requests
     *  are cosmetic — the frontend disables those controls. */
    rateLimitEnforced: boolean;
    /** Whether data-access enforcement is on. When false, data is publicly readable
     *  and API keys aren't required — the frontend disables the API-keys controls. */
    dataAccessEnforced: boolean;
}

/**
 * User-facing rate-limit-request operations.
 *
 * The effective quota is users.apiQuotaPerHour when set, else the role default
 * (rate limits are GLOBAL per user). A user may hold at most one PENDING request
 * at a time. requestedQuota is clamped to MAX_QUOTA; status/approvedQuota are
 * never settable here (server-owned, set by the admin approval path).
 */
@Injectable()
export class RateLimitRequestService {
    constructor(
        private readonly systemDataSource: SystemDataSource,
        private readonly config: ConfigService,
    ) {}

    private roleDefault(role: AppRole): number {
        return role === 'admin'
            ? this.config.get<number>('app.rateLimit.adminPerHour') ?? 5000
            : this.config.get<number>('app.rateLimit.systemUserPerHour') ?? 1000;
    }

    private maxQuota(): number {
        return this.config.get<number>('app.rateLimit.maxQuota') ?? 10000;
    }

    async submit(actor: AuthenticatedUser, dto: CreateRateLimitRequestDto): Promise<MyRateLimitSummary> {
        // Admins already have the admin quota and are the approvers — they neither
        // need to request nor could meaningfully approve their own request.
        if (actor.role === 'admin') {
            throw new ForbiddenException(
                'Administrators already have the maximum quota and do not submit rate-limit requests.',
            );
        }

        const max = this.maxQuota();
        if (dto.requestedQuota > max) {
            throw new BadRequestException(`Requested quota cannot exceed the maximum of ${max} requests/hour`);
        }

        const ds = this.systemDataSource.getDataSource();
        const pending = await ds.query<{ one: number }[]>(
            `SELECT 1 AS one FROM rate_limit_requests WHERE "userId" = $1 AND status = 'pending' LIMIT 1`,
            [actor.id],
        );
        if (pending.length > 0) {
            throw new ConflictException('You already have a pending rate-limit request');
        }

        const repo = this.systemDataSource.getRepository(RateLimitRequest);
        await repo.save(repo.create({
            userId: actor.id,
            requestedQuota: dto.requestedQuota,
            justification: dto.justification,
            status: 'pending',
        }));

        return this.listOwn(actor);
    }

    async listOwn(actor: AuthenticatedUser): Promise<MyRateLimitSummary> {
        const ds = this.systemDataSource.getDataSource();

        const data = await ds.query<RateLimitRequestRow[]>(
            `SELECT id, "requestedQuota", justification, status, "approvedQuota", "resolvedNote", "reviewedAt", "createdAt"
               FROM rate_limit_requests
              WHERE "userId" = $1
              ORDER BY "createdAt" DESC`,
            [actor.id],
        );

        const user = await this.systemDataSource.getRepository(User).findOne({ where: { id: actor.id } });
        const roleDefault = this.roleDefault(actor.role);
        const currentQuota = user?.apiQuotaPerHour ?? roleDefault;

        return {
            data,
            currentQuota,
            roleDefault,
            maxQuota: this.maxQuota(),
            hasPending: data.some((r) => r.status === 'pending'),
            rateLimitEnforced: this.config.get<boolean>('app.rateLimit.enforce') ?? false,
            dataAccessEnforced: this.config.get<boolean>('app.dataAccess.enforce') ?? false,
        };
    }
}
