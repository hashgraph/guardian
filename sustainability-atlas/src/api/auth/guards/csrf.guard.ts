import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { COOKIE_CSRF } from '../auth.types';

// Minimal structural request shape — no @types/express required.
interface MinimalRequest {
    headers: {
        cookie?: string;
        'x-csrf-token'?: string;
    };
}

// ── Inline cookie-header parser ───────────────────────────────────────────────
// Identical to the one in jwt-auth.guard.ts — co-located to avoid a shared
// module dependency; both are tiny and unlikely to change independently.

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

// ── CsrfGuard ────────────────────────────────────────────────────────────────

/**
 * Double-submit CSRF defense guard.
 *
 * The server sets a non-httpOnly 'csrf' cookie on login. The frontend reads it
 * via document.cookie and echoes it in the X-CSRF-Token request header. This
 * guard verifies that the header value matches the cookie value using
 * crypto.timingSafeEqual to prevent timing-based attacks.
 *
 * Applied at METHOD level on mutating cookie-authenticated routes:
 *   - POST /api/v1/auth/refresh
 *   - POST /api/v1/auth/logout
 *
 * Parses the raw Cookie header directly (independent of cookie-parser) so the
 * guard is robust to middleware-order changes.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<MinimalRequest>();

        const cookies = parseCookieHeader(request.headers.cookie);
        const cookieValue = cookies[COOKIE_CSRF] ?? '';
        const headerValue = request.headers['x-csrf-token'] ?? '';

        if (!cookieValue || !headerValue) {
            throw new ForbiddenException('CSRF token missing');
        }

        // timingSafeEqual requires equal-length buffers — length-check first to
        // avoid throwing and to prevent length-leak timing differences.
        const cookieBuf = Buffer.from(cookieValue, 'utf8');
        const headerBuf = Buffer.from(headerValue, 'utf8');

        if (cookieBuf.length !== headerBuf.length) {
            throw new ForbiddenException('CSRF token mismatch');
        }

        if (!timingSafeEqual(cookieBuf, headerBuf)) {
            throw new ForbiddenException('CSRF token mismatch');
        }

        return true;
    }
}
