/**
 * Shared TypeScript interfaces for the auth subsystem.
 *
 * Centralised here so guards, services, and the controller share a single set
 * of type definitions without importing @types/express (not installed).
 */

// ── Token payload ─────────────────────────────────────────────────────────────

/** Payload embedded in access JWTs. */
export interface AccessTokenPayload {
    /** User UUID (JWT "subject"). */
    sub: string;
    /** Unique JWT identifier — used for replay detection in a later phase. */
    jti: string;
    /** Logical session identifier shared across a rotation chain. */
    sessionId: string;
    /** Snapshot of users.tokenVersion at the time of issue. */
    tokenVersion: number;
    /** Snapshot of users.role at the time of issue. */
    role: 'system_user' | 'admin';
    /** Snapshot of users.email — lets the guard build req.user without a DB hit. */
    email: string;
    /** Snapshot of users.isActive at issue time. */
    isActive: boolean;
    /** Snapshot of whether the email was verified at issue time. */
    emailVerified: boolean;
    /** Per-user hourly API quota override (null = use role default). For rate limiting. */
    apiQuotaPerHour: number | null;
}

// ── Request user ──────────────────────────────────────────────────────────────

/** Shape of req.user after JwtAuthGuard resolves and attaches the user. */
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: 'system_user' | 'admin';
    tokenVersion: number;
    sessionId: string;
    /** Whether the user's email is verified (from the token claim). */
    emailVerified?: boolean;
    /** Per-user hourly API quota override (null = role default). For rate limiting. */
    apiQuotaPerHour?: number | null;
    /**
     * How the principal authenticated. Undefined/'jwt' = interactive cookie/bearer
     * session; 'apikey' = programmatic API key. Admin routes must reject 'apikey'
     * (keys grant data access only — never admin actions).
     */
    authVia?: 'jwt' | 'apikey';
}

// ── Refresh context ───────────────────────────────────────────────────────────

/** Caller context passed into TokenService.issueRefreshToken / rotateRefreshToken. */
export interface RefreshContext {
    ip?: string | null;
    userAgent?: string | null;
    /** Existing session id (for rotation — keeps the same session across rotations). */
    sessionId?: string;
    /** Existing family id (for rotation — keeps the same family across rotations). */
    familyId?: string;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/** Resolved cookie flags passed to cookie.util from the controller / service. */
export interface CookieConfig {
    domain?: string;
    sameSite: 'Lax' | 'Strict' | 'None';
    secure: boolean;
    /** Access token cookie max-age in milliseconds. */
    accessMaxAgeMs: number;
    /** Refresh token cookie max-age in milliseconds. */
    refreshMaxAgeMs: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum plaintext password length enforced by PasswordService.hash(). */
export const MIN_PASSWORD_LENGTH = 12;

/** httpOnly access-token cookie name. */
export const COOKIE_ACCESS = 'access';

/** httpOnly refresh-token cookie name (Path-scoped to /api/v1/auth/refresh). */
export const COOKIE_REFRESH = 'refresh';

/** Non-httpOnly CSRF double-submit cookie name. */
export const COOKIE_CSRF = 'csrf';

/** Role union type — mirrors User.role in the entity. */
export type AppRole = 'system_user' | 'admin';

// ── Authz snapshot cache ────────────────────────────────────────────────────────

/**
 * Cached snapshot of a user's authorization-relevant fields, shared by RolesGuard
 * (reads role + isActive) and ApiKeyGuard (needs all of them to build req.user)
 * under the key `authz:user:<id>`. Admin setRole/setStatus/setQuota delete the key
 * so revocation is immediate; otherwise it expires by TTL.
 */
export interface UserAuthSnapshot {
    role: AppRole;
    isActive: boolean;
    tokenVersion: number;
    apiQuotaPerHour: number | null;
    email: string;
}

/** TTL (seconds) for the authz:user:<id> snapshot cache. */
export const AUTHZ_CACHE_TTL_SECONDS = 20;

/** Builds the authz-snapshot cache key for a user id. */
export const authzCacheKey = (userId: string): string => `authz:user:${userId}`;
