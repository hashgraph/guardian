import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AuthenticatedUser } from '../auth.types';
import { ApiKeyResolver } from '../api-key-resolver.service';

// Minimal structural request shape — no @types/express required.
interface MinimalRequest {
    params?: Record<string, string | undefined>;
    headers: {
        origin?: string;
        referer?: string;
        authorization?: string;
        'x-api-key'?: string;
        'x-frontend-key'?: string;
    };
    user?: AuthenticatedUser;
}

/**
 * Access control for the PUBLIC data endpoints.
 *
 * Registered globally (APP_GUARD) but only enforces when BOTH:
 *   - app.dataAccess.enforce is true (DATA_ACCESS_ENFORCE), AND
 *   - the route is network-scoped (req.params.network present) — i.e. a data
 *     route. Auth/me/admin routes (no :network) are left to their own guards.
 *
 * When enforcing, a request is allowed if ANY of (cheapest first):
 *   1. X-Frontend-Key matches FRONTEND_SHARED_SECRET — the SSR server-to-server
 *      path (no browser Origin), constant-time compared.
 *   2. Origin / Referer is in the API_CORS_ORIGINS allowlist — a guest browsing
 *      through the trusted frontend.
 *   3. A valid API key — programmatic / scraping access (the only path that hits
 *      the DB), which also identifies the caller for per-key rate limiting.
 * Otherwise 401.
 *
 * NOTE: Origin/Referer are spoofable, so (2) is a casual-scraping gate; the real
 * control for programmatic callers is the API key + its rate limit. With enforce
 * OFF (default) this guard is a complete no-op — zero behaviour change.
 */
@Injectable()
export class DataAccessGuard implements CanActivate {
    constructor(
        private readonly config: ConfigService,
        private readonly resolver: ApiKeyResolver,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const enforce = this.config.get<boolean>('app.dataAccess.enforce');
        const request = context.switchToHttp().getRequest<MinimalRequest>();

        // No-op unless enforcing AND this is a network-scoped data route.
        if (!enforce || !request.params?.network) {
            return true;
        }

        // 1. Trusted frontend SSR (shared secret).
        const secret = this.config.get<string>('app.dataAccess.frontendSecret') || '';
        const provided = request.headers['x-frontend-key'];
        if (secret && provided && this.constantEquals(provided, secret)) {
            return true;
        }

        // 2. Guest via a trusted browser origin.
        if (this.originAllowed(request)) {
            return true;
        }

        // 3. Programmatic: valid API key (sets req.user for downstream rate limiting).
        if (await this.apiKeyValid(request)) {
            return true;
        }

        throw new UnauthorizedException('An API key is required for programmatic access to this endpoint');
    }

    private constantEquals(a: string, b: string): boolean {
        const ab = Buffer.from(a, 'utf8');
        const bb = Buffer.from(b, 'utf8');
        return ab.length === bb.length && timingSafeEqual(ab, bb);
    }

    private originAllowed(request: MinimalRequest): boolean {
        const allow = (process.env.API_CORS_ORIGINS || 'http://localhost:3000')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
        if (allow.length === 0) return false;

        const origin = request.headers.origin;
        if (origin && allow.includes(origin)) return true;

        const referer = request.headers.referer;
        if (referer) {
            try {
                if (allow.includes(new URL(referer).origin)) return true;
            } catch {
                /* malformed referer — ignore */
            }
        }
        return false;
    }

    private async apiKeyValid(request: MinimalRequest): Promise<boolean> {
        // Cached, throttled key resolution shared with ApiKeyGuard.
        const user = await this.resolver.resolve(this.resolver.extractKey(request.headers));
        if (!user) return false;
        request.user = user;
        return true;
    }
}
