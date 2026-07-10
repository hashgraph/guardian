import { IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
    resolvePasswordPolicy,
    passwordPolicyPattern,
    passwordPolicyMessage,
} from '@shared/config/configuration';

// Resolved once at module load — PASSWORD_SECURITY_LEVEL is fixed for a process.
const PASSWORD_POLICY = resolvePasswordPolicy();
const PASSWORD_PATTERN = passwordPolicyPattern(PASSWORD_POLICY);
const PASSWORD_MESSAGE = passwordPolicyMessage(PASSWORD_POLICY);

/**
 * DTO for the password-reset flow.
 *
 * The token is the raw single-use value sent in the reset-email link.
 * newPassword enforces the shared PASSWORD_SECURITY_LEVEL policy (same as signup).
 */
export class ResetPasswordDto {
    @ApiProperty({ description: 'Single-use password-reset token from the email link', maxLength: 512 })
    @IsString()
    @MaxLength(512)
    token: string;

    @ApiProperty({
        description: `New password — ${PASSWORD_MESSAGE}`,
        minLength: PASSWORD_POLICY.minLength,
        maxLength: 128,
    })
    @IsString()
    @MaxLength(128)
    @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
    newPassword: string;
}
