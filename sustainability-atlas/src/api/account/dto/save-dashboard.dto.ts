import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { DashboardType } from './dashboard-layout.types';

export class SaveDashboardDto {
    @ApiProperty({ enum: ['mainnet', 'testnet'] })
    @IsIn(['mainnet', 'testnet'])
    network: string;

    @ApiProperty({ enum: ['watchlist', 'widgets', 'custom_charts', 'watchlist_filters'] })
    @IsIn(['watchlist', 'widgets', 'custom_charts', 'watchlist_filters'])
    type: DashboardType;

    @IsNotEmpty()
    layout: unknown;
}
