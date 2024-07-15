import { ApiProperty } from '@nestjs/swagger';

export class InternalServerErrorDTO {
    @ApiProperty({
        type: 'number',
        required: true,
        example: 500,
    })
    code: number;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Error message',
    })
    message: string;
}
