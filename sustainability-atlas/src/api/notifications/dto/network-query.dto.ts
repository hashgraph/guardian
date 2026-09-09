import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Shared query DTO for endpoints that only need a `network` param
 * (unread-count, read-all). Matches the same enum used by the dashboard DTOs.
 */
export class NetworkQueryDto {
    @ApiProperty({ enum: ['mainnet', 'testnet'] })
    @IsIn(['mainnet', 'testnet'])
    network: string;
}
