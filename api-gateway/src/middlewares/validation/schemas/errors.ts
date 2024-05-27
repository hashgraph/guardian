import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class InternalServerErrorDTO {
    @ApiProperty({
        type: 'number',
        required: true,
        example: 500
    })
    @IsNumber()
    @Expose()
    code: number;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Error message'
    })
    @IsString()
    @Expose()
    message: string;
}
