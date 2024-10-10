import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * Report
 */
export class ReportDTO {
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
    status: string;

    @ApiProperty()
    @IsString()
    @Expose()
    steep: string;

    @ApiProperty()
    @IsString()
    @Expose()
    type: string;

    @ApiProperty()
    @IsNumber()
    @Expose()
    progress: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    maxProgress: number;

    @ApiProperty()
    @IsString()
    @Expose()
    error: string;
}