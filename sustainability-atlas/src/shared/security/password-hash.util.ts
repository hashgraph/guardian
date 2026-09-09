/**
 * Single source-of-truth password hashing primitive.
 *
 * Pure functions — NO NestJS DI. Reads process.env directly so it is callable
 * from both the DI container (PasswordService) and non-DI boot code
 * (system-bootstrap.ts seeder) without a cross-layer import smell.
 *
 * Algorithm preference:
 *   1. argon2id (native addon, memory-hard, preferred for low-entropy passwords)
 *   2. bcryptjs  (pure-JS fallback when the native argon2 addon is unavailable)
 *
 * Pepper: concatenated as `plain + PASSWORD_PEPPER` BEFORE hashing so the
 * hashed value never reveals the pepper, and a DB dump without the pepper env
 * var is useless for offline attacks.
 *
 * Constant-time verify: delegates to argon2.verify / bcrypt.compare which are
 * both constant-time. getDummyHash() pre-computes a hash so callers can run a
 * dummy verify on unknown-email login attempts to equalize timing.
 */

/** Environment-controlled pepper appended to the plaintext before hashing. */
function getPepper(): string {
    return process.env.PASSWORD_PEPPER || '';
}

/** bcryptjs round count (fallback path). */
function getBcryptRounds(): number {
    return parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
}

// ── Cached dummy hash ─────────────────────────────────────────────────────────
// Lazily computed once so the first unknown-email request takes argon2id time
// and every subsequent one is equally slow.
let _dummyHash: string | null = null;
let _dummyHashPromise: Promise<string> | null = null;

/**
 * Returns a pre-computed hash of the dummy string so callers can call
 * verifyPasswordRaw(dummyHash, plainFromRequest) to equalize timing
 * for unknown-email login attempts.
 *
 * The returned hash is stable across the process lifetime (lazily computed once).
 * SYNCHRONOUS after the first await; callers should use `await getDummyHash()`
 * only on the slow path (auth controller init / first unknown-email attempt).
 */
export async function getDummyHashAsync(): Promise<string> {
    if (_dummyHash) return _dummyHash;
    if (_dummyHashPromise) return _dummyHashPromise;

    _dummyHashPromise = hashPasswordRaw('__se_dummy_password_for_timing__').then((h) => {
        _dummyHash = h;
        _dummyHashPromise = null;
        return h;
    });
    return _dummyHashPromise;
}

/**
 * Returns the cached dummy hash synchronously (empty-string sentinel before
 * it has been computed — callers that need the hash MUST call
 * getDummyHashAsync() at least once first).
 *
 * Exported so PasswordService can expose a sync accessor after warm-up.
 */
export function getDummyHash(): string {
    return _dummyHash ?? '';
}

// ── Core hashing ─────────────────────────────────────────────────────────────

/**
 * Hashes `plain` with pepper applied.
 *
 * Tries argon2id first; transparently falls back to bcryptjs if the native
 * addon is not available (Windows dev host without build tools, cross-compiled
 * image, etc.).
 */
export async function hashPasswordRaw(plain: string): Promise<string> {
    const peppered = plain + getPepper();
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const argon2 = require('argon2') as typeof import('argon2');
        return await argon2.hash(peppered, { type: argon2.argon2id });
    } catch {
        // argon2 native build unavailable — fall back to bcryptjs (pure JS).
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bcrypt = require('bcryptjs') as typeof import('bcryptjs');
        return bcrypt.hash(peppered, getBcryptRounds());
    }
}

/**
 * Constant-time verification. Auto-detects the algorithm by inspecting the
 * hash prefix:
 *   $argon2  → argon2.verify (applies pepper before comparison)
 *   $2       → bcrypt.compare (applies pepper before comparison)
 *
 * Returns false (never throws) on algorithm mismatch or corrupted hash so
 * the caller always gets a boolean outcome.
 */
export async function verifyPasswordRaw(hash: string, plain: string): Promise<boolean> {
    const peppered = plain + getPepper();
    try {
        if (hash.startsWith('$argon2')) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const argon2 = require('argon2') as typeof import('argon2');
            return await argon2.verify(hash, peppered);
        } else if (hash.startsWith('$2')) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const bcrypt = require('bcryptjs') as typeof import('bcryptjs');
            return await bcrypt.compare(peppered, hash);
        }
        return false;
    } catch {
        return false;
    }
}
