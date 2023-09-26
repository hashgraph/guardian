import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class TaskDTO {
    @ApiProperty()
    @IsString()
    taskId: string;

    @ApiProperty()
    @IsNumber()
    expectation: number;
}