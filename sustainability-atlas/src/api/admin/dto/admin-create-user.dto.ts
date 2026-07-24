import {
    IsEmail,
    IsString,
    IsIn,
    Matches,
    MaxLength,
    IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AppRole } from '../../auth/auth.types';
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
 * DTO for an administrator creating a user account.
 *
 * Unlike the public SignUpDto, this DTO DOES expose `role` — but only because it
 * is bound exclusively on @Roles('admin') routes. `role` is enum-validated so a
 * value like 'superadmin' is rejected. Privileged state the admin must NOT set
 * directly (isActive, tokenVersion, apiQuotaPerHour) is intentionally absent;
 * the service sets isActive/emailVerifiedAt/mustChangePassword itself.
 *
 * VARCHAR limits match the users entity / bootstrapSystemSchema column sizes.
 */
export class AdminCreateUserDto {
    @ApiProperty({ description: 'Email address (login identifier)' })
    @IsEmail({}, { message: 'Please enter a valid email address (e.g. name@example.com).' })
    email: string;

    @ApiProperty({ description: `Initial password — ${PASSWORD_MESSAGE}`, minLength: PASSWORD_POLICY.minLength, maxLength: 128 })
    @IsString()
    @MaxLength(128)
    @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
    password: string;

    @ApiProperty({ description: 'Role to assign', enum: ['system_user', 'admin'] })
    @IsIn(['system_user', 'admin'])
    role: AppRole;

    @ApiPropertyOptional({ description: 'First name', maxLength: 120 })
    @IsOptional() @IsString() @MaxLength(120)
    firstName?: string;

    @ApiPropertyOptional({ description: 'Last name', maxLength: 120 })
    @IsOptional() @IsString() @MaxLength(120)
    lastName?: string;

    @ApiPropertyOptional({ description: 'Organisation name', maxLength: 200 })
    @IsOptional() @IsString() @MaxLength(200)
    organisation?: string;

    @ApiPropertyOptional({ description: 'Job title', maxLength: 120 })
    @IsOptional() @IsString() @MaxLength(120)
    jobTitle?: string;

    @ApiPropertyOptional({ description: 'Country', maxLength: 100 })
    @IsOptional() @IsString() @MaxLength(100)
    country?: string;
}
