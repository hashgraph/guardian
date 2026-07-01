import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemDataSource } from '@api/database/system-database.module';
import { RedisService } from '@shared/redis/redis.service';
import { User } from '@shared/entities/auth/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
    AppRole,
    AuthenticatedUser,
    UserAuthSnapshot,
    AUTHZ_CACHE_TTL_SECONDS,
    authzCacheKey,
} from '../auth.types';

// Minimal structural request shape — no @types/express required.
interface MinimalRequest {
    user?: AuthenticatedUser;
}

/**
 * Role-based access control guard.
 *
 * Reads the required roles from @Roles() metadata. If no @Roles decorator is
 * present, the guard allows all authenticated users through WITHOUT a DB hit.
 *
 * For role-restricted routes (e.g. @Roles('admin')) it re-verifies the user's
 * role + isActive via a short Redis cache (20 s TTL, key "authz:user:<id>").
 * On a cache miss it falls back to the system DB — NEVER allows access without
 * a DB row or a valid cache entry (fail-closed). Admin mutations (setRole /
 * setStatus) explicitly delete the key so revocation is immediate in practice.
 *
 * Must run after JwtAuthGuard (which populates req.user): @UseGuards(JwtAuthGuard, RolesGuard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly systemDataSource: SystemDataSource,
        private readonly redis: RedisService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<AppRole[] | undefined>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No @Roles constraint → allow all authenticated users (no DB hit).
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<MinimalRequest>();
        const user = request.user;
        if (!user) {
            // Should not happen when JwtAuthGuard runs first, but be defensive.
            throw new ForbiddenException('Access denied');
        }

        // API keys are data-access credentials only — never admin actions.
        if (user.authVia === 'apikey') {
            throw new ForbiddenException('API keys cannot access role-restricted endpoints');
        }

        // Cache-through re-verification for the role-restricted (low-frequency) path.
        // The snapshot is shared with ApiKeyGuard, so we store the FULL shape even
        // though this guard only reads role + isActive.
        const cacheKey = authzCacheKey(user.id);
        let entry = await this.redis.getJson<UserAuthSnapshot>(cacheKey);

        if (!entry || entry.email === undefined) {
            // Cache miss (or a partial legacy entry) — hit the DB.
            const fresh = await this.systemDataSource
                .getRepository(User)
                .findOne({ where: { id: user.id } });
            if (!fresh) {
                throw new UnauthorizedException('Account is deactivated');
            }
            entry = {
                role: fresh.role,
                isActive: fresh.isActive,
                tokenVersion: fresh.tokenVersion,
                apiQuotaPerHour: fresh.apiQuotaPerHour,
                email: fresh.email,
            };
            // Best-effort write — swallowed by setJson on error.
            await this.redis.setJson(cacheKey, entry, AUTHZ_CACHE_TTL_SECONDS);
        }

        if (!entry.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }
        if (!requiredRoles.includes(entry.role)) {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Reflect the (possibly refreshed) role downstream.
        user.role = entry.role;
        return true;
    }
}
