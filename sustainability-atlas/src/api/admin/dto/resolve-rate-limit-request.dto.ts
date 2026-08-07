import { IsIn, IsOptional, IsInt, Min, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Admin decision on a rate-limit request.
 *
 * - 'approved'  → grants the requested quota (clamped to MAX_QUOTA).
 * - 'adjusted'  → grants approvedQuota, which MAY be lower than requested or even
 *                 lower than the user's current quota (i.e. a reduction).
 * - 'declined'  → no quota change.
 *
 * reviewerId is taken from the authenticated admin (never the body). approvedQuota
 * is required only for 'adjusted' and is clamped server-side to [1, MAX_QUOTA].
 */
export class ResolveRateLimitRequestDto {
    @ApiProperty({ enum: ['approved', 'adjusted', 'declined'] })
    @IsIn(['approved', 'adjusted', 'declined'])
    decision: 'approved' | 'adjusted' | 'declined';

    @ApiPropertyOptional({ description: 'Required for "adjusted" — the granted quota (may be lower than requested)', minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    approvedQuota?: number;

    @ApiPropertyOptional({ description: 'Optional note shown to the requester', maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
}
