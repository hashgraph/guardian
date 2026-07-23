/**
 * Cookie helpers for the auth subsystem.
 *
 * Plain functions — NOT @Injectable. Structural typing is used for the response
 * object so @types/express is not required (not installed). The minimal
 * interface matches Express 5's res.cookie / res.clearCookie signature exactly.
 *
 * Three cookies are managed:
 *   'access'  — httpOnly, access-token, full-path
 *   'refresh' — httpOnly, refresh-token, Path-scoped to /api/v1/auth/refresh
 *   'csrf'    — NON-httpOnly (readable by JS for the X-CSRF-Token header)
 *
 * Cookie flags are driven by the CookieConfig passed in by the caller (built
 * from ConfigService in the controller/service that owns the request context).
 */

import { COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_CSRF, CookieConfig } from './auth.types';

// ── Minimal structural interfaces ─────────────────────────────────────────────
// These replace @types/express. Must match Express 5 res.cookie / clearCookie.

interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None' | boolean;
    domain?: string;
    path?: string;
    maxAge?: number;
}

/** Minimal structural shape of an Express (or compatible) response object. */
export interface CookieWriter {
    cookie(name: string, value: string, options: CookieOptions): unknown;
    clearCookie(name: string, options?: CookieOptions): unknown;
}

// ── Shared base options ───────────────────────────────────────────────────────

function baseOptions(cfg: CookieConfig): CookieOptions {
    return {
        secure: cfg.secure,
        sameSite: cfg.sameSite,
        // Only include domain when explicitly configured — omitting it lets the
        // browser infer the current host, which is correct for localhost dev.
        ...(cfg.domain ? { domain: cfg.domain } : {}),
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sets the three auth cookies on the response.
 *
 * @param res     Express-compatible response object
 * @param tokens  Raw token strings
 * @param cfg     Resolved cookie configuration from ConfigService
 */
export function setAuthCookies(
    res: CookieWriter,
    tokens: { access: string; refresh: string; csrf: string },
    cfg: CookieConfig,
): void {
    const base = baseOptions(cfg);

    // Access token — httpOnly, full-path, short-lived
    res.cookie(COOKIE_ACCESS, tokens.access, {
        ...base,
        httpOnly: true,
        maxAge: cfg.accessMaxAgeMs,
    });

    // Refresh token — httpOnly, path-scoped to the refresh endpoint
    res.cookie(COOKIE_REFRESH, tokens.refresh, {
        ...base,
        httpOnly: true,
        path: '/api/v1/auth/refresh',
        maxAge: cfg.refreshMaxAgeMs,
    });

    // CSRF double-submit cookie — NOT httpOnly so JS can read it and send as
    // X-CSRF-Token header; a session-bound random value set by the server.
    res.cookie(COOKIE_CSRF, tokens.csrf, {
        ...base,
        httpOnly: false,
        maxAge: cfg.refreshMaxAgeMs, // same lifetime as refresh session
    });
}

/**
 * Clears all three auth cookies.
 *
 * Path and domain MUST match what was used in setAuthCookies; otherwise the
 * browser will not delete the scoped cookie.
 */
export function clearAuthCookies(res: CookieWriter, cfg: CookieConfig): void {
    const base = baseOptions(cfg);

    res.clearCookie(COOKIE_ACCESS, { ...base });
    res.clearCookie(COOKIE_REFRESH, { ...base, path: '/api/v1/auth/refresh' });
    res.clearCookie(COOKIE_CSRF, { ...base });
}
