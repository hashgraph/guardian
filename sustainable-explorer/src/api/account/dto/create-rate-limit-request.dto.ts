import { IsInt, Min, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for a user requesting an API rate-limit increase.
 *
 * Only requestedQuota + justification are accepted — userId is taken from the
 * authenticated principal and status/approvedQuota/reviewerId are server-owned
 * (never settable by the requester). requestedQuota is further clamped to the
 * configured MAX_QUOTA in the service.
 */
export class CreateRateLimitRequestDto {
    @ApiProperty({ description: 'Requested requests-per-hour quota', minimum: 1 })
    @IsInt()
    @Min(1)
    requestedQuota: number;

    @ApiProperty({ description: 'Justification for the increase', minLength: 10, maxLength: 2000 })
    @IsString()
    @MinLength(10)
    @MaxLength(2000)
    justification: string;
}
