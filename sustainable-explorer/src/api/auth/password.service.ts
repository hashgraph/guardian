import { Injectable, BadRequestException } from '@nestjs/common';
import {
    hashPasswordRaw,
    verifyPasswordRaw,
    getDummyHashAsync,
} from '@shared/security/password-hash.util';
import { resolvePasswordPolicy } from '@shared/config/configuration';

/**
 * Thin @Injectable wrapper over the shared password-hash.util primitive.
 *
 * All hashing/verification logic lives in the util so both this DI-managed
 * service and the non-DI boot seeder (system-bootstrap.ts) share exactly one
 * implementation. This service adds only the NestJS integration layer:
 *   - Password-policy minimum-length enforcement (maps to BadRequestException → 400)
 *   - dummyVerify for unknown-email timing equalization
 *
 * Reads pepper/rounds via the util (process.env) to stay consistent with the
 * non-DI path — ConfigService is deliberately NOT injected here.
 */
@Injectable()
export class PasswordService {
    /**
     * Hashes a plaintext password.
     *
     * Defence-in-depth minimum-length check against the resolved password policy
     * (PASSWORD_SECURITY_LEVEL) — the DTO @Matches validator is the primary gate;
     * this guards non-DTO callers. A short password throws an automatic HTTP 400.
     */
    async hash(plain: string): Promise<string> {
        const minLength = resolvePasswordPolicy().minLength;
        if (plain.length < minLength) {
            throw new BadRequestException(
                `Password must be at least ${minLength} characters`,
            );
        }
        return hashPasswordRaw(plain);
    }

    /**
     * Constant-time password verification.
     *
     * Delegates to verifyPasswordRaw which auto-detects argon2 vs bcrypt by
     * inspecting the hash prefix and applies the pepper consistently.
     */
    async verify(hash: string, plain: string): Promise<boolean> {
        return verifyPasswordRaw(hash, plain);
    }

    /**
     * Runs a full verify cycle against a pre-computed dummy hash.
     *
     * Call this when the submitted email is not found in the database so the
     * response time is indistinguishable from a successful-but-wrong-password
     * attempt, preventing account enumeration via timing.
     */
    async dummyVerify(plain: string): Promise<void> {
        const dummy = await getDummyHashAsync();
        // Result is intentionally discarded — we only want the timing.
        await verifyPasswordRaw(dummy, plain);
    }
}
