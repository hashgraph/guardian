import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, } from 'class-validator';
import { Examples } from '../examples.js';

export class WorkersTasksDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DATE
    })
    @IsString()
    createDate: string;

    @ApiProperty({
        type: Boolean,
        required: true,
        example: true
    })
    @IsBoolean()
    done: boolean;

    @ApiProperty({
        type: String,
        required: true,
        example: null
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: Boolean,
        required: true,
        example: true
    })
    @IsBoolean()
    isRetryableTask: boolean;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DATE
    })
    @IsString()
    processedTime: string;

    @ApiProperty({
        type: Boolean,
        required: true,
        example: true
    })
    @IsBoolean()
    sent: boolean;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.UUID
    })
    @IsString()
    taskId: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'send-hedera'
    })
    @IsString()
    type: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DATE
    })
    @IsString()
    updateDate: string;
}
