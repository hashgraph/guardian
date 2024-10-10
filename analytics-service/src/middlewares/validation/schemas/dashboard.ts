import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * Dashboard
 */
export class DashboardDTO {
    @ApiProperty()
    @IsString()
    @Expose()
    @IsNotEmpty()
    uuid: string;

    @ApiProperty()
    @IsString()
    @Expose()
    @IsNotEmpty()
    root: string;

    @ApiProperty()
    @IsString()
    @Expose()
    date: string;
}