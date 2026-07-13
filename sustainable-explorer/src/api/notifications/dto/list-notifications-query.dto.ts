import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ListNotificationsQueryDto {
    @ApiProperty({ enum: ['mainnet', 'testnet'] })
    @IsIn(['mainnet', 'testnet'])
    network: string;

    @ApiPropertyOptional({ description: 'Opaque keyset-pagination cursor from a previous response' })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ description: 'Max items to return (default 20, max 100)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'When true, only return unread notifications' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === '1')
    @IsBoolean()
    unreadOnly?: boolean = false;
}
