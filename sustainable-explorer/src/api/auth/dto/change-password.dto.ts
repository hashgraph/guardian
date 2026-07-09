import { IsString, MinLength, Matches, MaxLength } from 'class-validator';
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
 * Body for an authenticated user changing their own password (used by the
 * forced "must change password" flow for admin-created / seeded accounts, and
 * for voluntary password changes from account settings).
 */
export class ChangePasswordDto {
    @ApiProperty({ description: 'The current password' })
    @IsString()
    @MinLength(1)
    currentPassword: string;

    @ApiProperty({ description: `The new password — ${PASSWORD_MESSAGE}`, minLength: PASSWORD_POLICY.minLength, maxLength: 128 })
    @IsString()
    @MaxLength(128)
    @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
    newPassword: string;
}
