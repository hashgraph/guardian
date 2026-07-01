import { Injectable, BadRequestException } from '@nestjs/common';
import {
    hashPasswordRaw,
    verifyPasswordRaw,
    getDummyHashAsync,
} from '@shared/security/password-hash.util';
import { MIN_PASSWORD_LENGTH } from './auth.types';

/**
 * Thin @Injectable wrapper over the shared password-hash.util primitive.
 *
 * All hashing/verification logic lives in the util so both this DI-managed
 * service and the non-DI boot seeder (system-bootstrap.ts) share exactly one
 * implementation. This service adds only the NestJS integration layer:
 *   - MIN_PASSWORD_LENGTH enforcement (maps to BadRequestException → HTTP 400)
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
     * Throws BadRequestException if the password is shorter than
     * MIN_PASSWORD_LENGTH (12) so the controller gets an automatic HTTP 400.
     */
    async hash(plain: string): Promise<string> {
        if (plain.length < MIN_PASSWORD_LENGTH) {
            throw new BadRequestException(
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
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
