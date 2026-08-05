import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../auth.types';
import { ApiKeyResolver } from '../api-key-resolver.service';

// Minimal structural request shape — no @types/express required.
interface MinimalRequest {
    headers: {
        authorization?: string;
        'x-api-key'?: string;
    };
    user?: AuthenticatedUser;
}

/**
 * Programmatic API-key authentication guard.
 *
 * Delegates key resolution (parse → cached lookup → constant-time compare →
 * cached owner resolve → throttled lastUsedAt) to the shared ApiKeyResolver, so
 * this and DataAccessGuard share one cached path. A uniform 401 is returned for
 * missing / unknown / revoked / expired / mismatched keys (the reason is never
 * disclosed). Sets req.user.authVia='apikey'; admin routes must never use it.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly resolver: ApiKeyResolver,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<MinimalRequest>();
        const raw = this.resolver.extractKey(request.headers);
        if (!raw) {
            throw new UnauthorizedException('API key required');
        }

        const user = await this.resolver.resolve(raw);
        if (!user) {
            throw new UnauthorizedException('Invalid API key');
        }

        request.user = user;
        return true;
    }
}
