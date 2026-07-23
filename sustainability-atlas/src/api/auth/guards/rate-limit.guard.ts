import {
    CanActivate,
    ExecutionContext,
    Injectable,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@shared/redis/redis.service';
import { TokenService } from '../token.service';
import { AuthenticatedUser, AppRole } from '../auth.types';

// Minimal structural shapes — no @types/express required.
interface MinimalRequest {
    ip?: string;
    socket?: { remoteAddress?: string };
    headers: {
        cookie?: string;
        authorization?: string;
        'x-forwarded-for'?: string;
    };
    user?: AuthenticatedUser;
    /** Set by DataAccessGuard for trusted-frontend traffic — exempt from limits. */
    rateLimitExempt?: boolean;
}
interface MinimalResponse {
    setHeader(name: string, value: string): unknown;
}

const WINDOW_SECONDS = 3600; // per-hour quota

/**
 * Global rate-limit guard (Redis-backed, atomic counters).
 *
 * No-op unless app.rateLimit.enforce is true (RATE_LIMIT_ENFORCE) — flag-gated.
 *
 * Bucket + limit resolution (cheapest first, no extra DB calls):
 *   1. req.user already set (API key via DataAccessGuard / cookie via JwtAuthGuard
 *      on protected routes) → per-USER bucket, limit = apiQuotaPerHour ?? role default.
 *   2. else verify the access JWT from the cookie/bearer (no DB) → per-USER bucket.
 *   3. else → per-IP bucket with the guest quota.
 *
 * Sets X-RateLimit-* headers; throws 429 with Retry-After when exceeded. Redis
 * errors fail OPEN (handled in RedisService) so an outage can't break the API.
 *
 * NOTE: per-API-key limiting requires DataAccessGuard (Plan B) to be enabled too,
 * since that is what resolves req.user for key auth. Login brute-force is covered
 * separately by per-account lockout (failedLoginCount/lockedUntil).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private readonly config: ConfigService,
        private readonly redis: RedisService,
        private readonly tokenService: TokenService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (!this.config.get<boolean>('app.rateLimit.enforce')) {
            return true;
        }

        const request = context.switchToHttp().getRequest<MinimalRequest>();

        // Trusted-frontend UI + login are exempt (DataAccessGuard runs first and
        // marks them). Rate limits apply only to programmatic (API-key / direct)
        // callers — never the frontend, and never an unauthenticated login request.
        if (request.rateLimitExempt) {
            return true;
        }

        const response = context.switchToHttp().getResponse<MinimalResponse>();

        const { key, limit } = await this.resolveBucket(request);
        const result = await this.redis.rateLimit(key, limit, WINDOW_SECONDS);

        response.setHeader('X-RateLimit-Limit', String(limit));
        response.setHeader('X-RateLimit-Remaining', String(result.remaining));
        response.setHeader('X-RateLimit-Reset', String(result.resetSeconds));

        if (!result.allowed) {
            response.setHeader('Retry-After', String(result.resetSeconds));
            throw new HttpException(
                'Rate limit exceeded — please slow down and try again later.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
        return true;
    }

    private async resolveBucket(request: MinimalRequest): Promise<{ key: string; limit: number }> {
        // 1. Principal already resolved by a prior guard.
        if (request.user) {
            return {
                key: `rl:user:${request.user.id}`,
                limit: this.userLimit(request.user.apiQuotaPerHour, request.user.role),
            };
        }

        // 2. Try the access JWT (cookie or bearer) — cheap verify, no DB.
        const token = this.extractAccessToken(request);
        if (token) {
            try {
                const payload = await this.tokenService.verifyAccessToken(token);
                return {
                    key: `rl:user:${payload.sub}`,
                    limit: this.userLimit(payload.apiQuotaPerHour, payload.role),
                };
            } catch {
                /* not a valid JWT (e.g. an API key, or expired) — fall through */
            }
        }

        // 3. Guest — per-IP bucket.
        return {
            key: `rl:ip:${this.clientIp(request)}`,
            limit: this.config.get<number>('app.rateLimit.guestPerHour') ?? 600,
        };
    }

    private userLimit(quota: number | null | undefined, role: AppRole): number {
        if (typeof quota === 'number' && quota > 0) return quota;
        return role === 'admin'
            ? this.config.get<number>('app.rateLimit.adminPerHour') ?? 5000
            : this.config.get<number>('app.rateLimit.systemUserPerHour') ?? 1000;
    }

    private extractAccessToken(request: MinimalRequest): string | null {
        const cookie = request.headers.cookie;
        if (cookie) {
            const match = cookie.match(/(?:^|;\s*)access=([^;]+)/);
            if (match) return decodeURIComponent(match[1]);
        }
        const auth = request.headers.authorization;
        // A Bearer api key (se_...) is not a JWT — skip it (handled as guest/user via req.user).
        if (auth?.startsWith('Bearer ')) {
            const value = auth.slice(7).trim();
            if (!value.startsWith('se_')) return value;
        }
        return null;
    }

    private clientIp(request: MinimalRequest): string {
        const xff = request.headers['x-forwarded-for'];
        if (xff) return xff.split(',')[0].trim();
        return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    }
}
