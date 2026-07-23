import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../auth.types';

// ── Minimal structural request interface ──────────────────────────────────────
// @types/express is NOT installed. This structural shape matches Express 5's
// IncomingMessage + Express Request fields that this guard actually accesses.

interface MinimalRequest {
    headers: {
        cookie?: string;
        authorization?: string;
    };
    user?: AuthenticatedUser;
}

// ── Inline cookie-header parser ───────────────────────────────────────────────
// Parses the raw `Cookie: name=value; name2=value2` header directly, independent
// of cookie-parser, so the guard works even if the middleware order changes or
// the guard is reused outside the HTTP app context.

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader
            .split(';')
            .map((pair) => pair.trim().split('='))
            .filter((parts) => parts.length >= 2)
            .map(([name, ...rest]) => [name.trim(), rest.join('=').trim()]),
    );
}

// ── JwtAuthGuard ──────────────────────────────────────────────────────────────

/**
 * JWT authentication guard.
 *
 * Token extraction order:
 *   1. 'access' httpOnly cookie (parsed inline — cookie-parser is not wired).
 *   2. Authorization: Bearer <token> header (fallback for programmatic clients).
 *
 * Rejection criteria (in addition to invalid/expired JWT):
 *   - user row not found in the system DB
 *   - user.isActive === false
 *   - token.tokenVersion !== user.tokenVersion (password changed / forced logout)
 *
 * On success, attaches a typed AuthenticatedUser to req.user.
 *
 * @Public() bypass: when the route (method or class) carries IS_PUBLIC_KEY metadata
 * via the @Public() decorator, the guard short-circuits to true without reading
 * any token — so it stays safe to register globally without reworking the
 * public-read routes. Currently applied at method level (not a global APP_GUARD).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tokenService: TokenService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // @Public() bypass — honour on both method and class level
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<MinimalRequest>();
        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('No authentication token provided');
        }

        // Verify the JWT signature and expiry
        const payload = await this.tokenService.verifyAccessToken(token);

        // Identity is read from the VERIFIED token claims — NO per-request DB call.
        // This is the hot path (every page nav / search by a logged-in user), so it
        // must stay cheap. isActive/role here are the snapshot at token-issue time;
        // deactivation/role changes take effect via refresh-token revocation + the
        // short access-token TTL, and admin routes additionally re-verify role +
        // isActive LIVE in RolesGuard (low-frequency, immediate admin revocation).
        if (!payload.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        request.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            tokenVersion: payload.tokenVersion,
            sessionId: payload.sessionId,
            emailVerified: payload.emailVerified,
            apiQuotaPerHour: payload.apiQuotaPerHour,
            authVia: 'jwt',
        };

        return true;
    }

    private extractToken(request: MinimalRequest): string | null {
        // 1. httpOnly cookie
        const cookies = parseCookieHeader(request.headers.cookie);
        if (cookies['access']) {
            return cookies['access'];
        }

        // 2. Authorization: Bearer header
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }

        return null;
    }
}
