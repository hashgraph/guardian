import {
    IsEmail,
    IsString,
    IsIn,
    MinLength,
    MaxLength,
    IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AppRole } from '../../auth/auth.types';

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
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Initial password (minimum 12 characters)', minLength: 12, maxLength: 128 })
    @IsString()
    @MinLength(12)
    @MaxLength(128)
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
