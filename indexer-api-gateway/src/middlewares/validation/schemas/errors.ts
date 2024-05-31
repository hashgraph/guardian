import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class InternalServerErrorDTO {
    @ApiProperty()
    @IsNumber()
    @Expose()
    code: number;

    @ApiProperty()
    @IsString()
    @Expose()
    message: string;
}