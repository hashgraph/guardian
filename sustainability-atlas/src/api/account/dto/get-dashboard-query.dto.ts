import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetDashboardQueryDto {
    @ApiProperty({ enum: ['mainnet', 'testnet'] })
    @IsIn(['mainnet', 'testnet'])
    network: string;
}
