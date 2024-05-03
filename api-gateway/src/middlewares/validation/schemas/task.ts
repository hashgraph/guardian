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

export class StatusDTO {
    @ApiProperty()
    @IsString()
    message: string;

    @ApiProperty()
    @IsNumber()
    type: number;
}

export class TaskStatusDTO {
    @ApiProperty()
    @IsString()
    action: string;

    @ApiProperty()
    @IsString()
    userId: string;

    @ApiProperty()
    @IsNumber()
    expectation: number;

    @ApiProperty()
    @IsString()
    taskId: string;

    @ApiProperty()
    @IsString()
    date: string;

    @ApiProperty({ isArray: true, type: () => StatusDTO })
    statuses: StatusDTO[];

    @ApiProperty({ type: 'object' })
    result: any;

    @ApiProperty({ type: 'object' })
    error: any;
}