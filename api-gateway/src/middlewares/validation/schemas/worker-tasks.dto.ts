import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, } from 'class-validator';

export class WorkersTasksDTO{
    @ApiProperty()
    @IsString()
    createDate: string;

    @ApiProperty()
    @IsBoolean()
    done: boolean;

    @ApiProperty()
    @IsString()
    id: string;

    @ApiProperty()
    @IsBoolean()
    isRetryableTask: boolean;

    @ApiProperty()
    @IsString()
    processedTime: string;

    @ApiProperty()
    @IsBoolean()
    sent: boolean;

    @ApiProperty()
    @IsString()
    taskId: string;

    @ApiProperty()
    @IsString()
    type: string;

    @ApiProperty()
    @IsString()
    updateDate: string;
}
