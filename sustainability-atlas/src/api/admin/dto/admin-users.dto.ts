import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    IsInt,
    Min,
    Max,
    IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import type { AppRole } from '../../auth/auth.types';

/** Query params for the admin user-list endpoint. */
export class AdminListUsersQueryDto {
    @ApiPropertyOptional({ description: 'Search by email, first or last name', maxLength: 200 })
    @IsOptional() @IsString() @MaxLength(200)
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by role', enum: ['system_user', 'admin'] })
    @IsOptional() @IsIn(['system_user', 'admin'])
    role?: AppRole;

    @ApiPropertyOptional({ description: 'Filter by status', enum: ['active', 'inactive'] })
    @IsOptional() @IsIn(['active', 'inactive'])
    status?: 'active' | 'inactive';

    @ApiPropertyOptional({ description: 'Filter by email verification status', enum: ['verified', 'unverified'] })
    @IsOptional() @IsIn(['verified', 'unverified'])
    verified?: 'verified' | 'unverified';

    @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    page?: number;

    @ApiPropertyOptional({ description: 'Page size (max 1000)', default: 20 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
    limit?: number;
}

/** Body for activate / deactivate. */
export class UpdateUserStatusDto {
    @ApiProperty({ description: 'true = active, false = deactivated' })
    @IsBoolean()
    isActive: boolean;
}

/** Body for role change. */
export class UpdateUserRoleDto {
    @ApiProperty({ description: 'New role', enum: ['system_user', 'admin'] })
    @IsIn(['system_user', 'admin'])
    role: AppRole;
}

/**
 * Body for an admin setting/reducing a user's API rate-limit quota.
 * Justification is required (recorded in the audit log); the quota is clamped to
 * [1, maxQuota] in the service.
 */
export class SetUserQuotaDto {
    @ApiProperty({ description: 'New per-hour quota (clamped to [1, maxQuota])', minimum: 1 })
    @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000)
    quota: number;

    @ApiProperty({ description: 'Why the limit is being changed (audited)', maxLength: 1000 })
    // Trim BEFORE validation so a whitespace-only reason ("   ") is rejected — the
    // justification is the whole point of the audit entry, so it must be non-empty.
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString() @MinLength(3) @MaxLength(1000)
    justification: string;
}
