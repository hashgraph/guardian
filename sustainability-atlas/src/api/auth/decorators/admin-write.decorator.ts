import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CsrfGuard } from '../guards/csrf.guard';
import { Roles } from './roles.decorator';

/**
 * Marks a mutating route as ADMIN-ONLY.
 *
 * Composes the full guard stack for a cookie-authenticated admin mutation:
 *   - JwtAuthGuard  → valid session, live isActive/tokenVersion check
 *   - RolesGuard + @Roles('admin') → admin role required
 *   - CsrfGuard     → double-submit CSRF token (these are state-changing)
 *
 * Use on the sensitive maintenance endpoints (redecode, reparse, re-extract,
 * refresh-ipfs) that the spec scopes to administrators.
 */
export function AdminWrite() {
    return applyDecorators(
        ApiCookieAuth(),
        UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard),
        Roles('admin'),
    );
}

/**
 * Marks a NON-mutating route (GET / SSE) as ADMIN-ONLY.
 *
 * Same as AdminWrite but without CsrfGuard (CSRF applies only to state-changing
 * requests). Use for admin-only operational reads (queue/sync/ipfs monitoring,
 * the live events stream).
 */
export function AdminRead() {
    return applyDecorators(
        ApiCookieAuth(),
        UseGuards(JwtAuthGuard, RolesGuard),
        Roles('admin'),
    );
}
