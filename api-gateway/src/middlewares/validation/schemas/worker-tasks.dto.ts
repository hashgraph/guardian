import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, } from 'class-validator';
import { WorkerTaskType } from '@guardian/interfaces';
import { Examples } from '../examples.js';

export class WorkersTasksDTO {
    @ApiProperty({
        type: String,
        description: 'Task creation date in ISO 8601 format',
        example: Examples.DATE
    })
    @IsString()
    createDate: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        example: Examples.DATE
    })
    @IsString()
    updateDate: string;

    @ApiProperty({
        type: String,
        description: 'Unique task identifier (UUID)',
        example: Examples.UUID
    })
    @IsString()
    taskId: string;

    @ApiProperty({
        type: String,
        description: 'Task type — defines what operation this worker task performs',
        enum: WorkerTaskType,
        example: WorkerTaskType.ADD_FILE
    })
    @IsString()
    type: WorkerTaskType;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the task has been sent to a worker',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    sent?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the task has been completed',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    done?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the task can be retried after failure',
        example: true
    })
    @IsBoolean()
    isRetryableTask: boolean;

    @ApiProperty({
        type: String,
        description: 'Timestamp when the task was processed (ISO 8601), or null if not yet processed',
        required: false,
        nullable: true,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    processedTime?: string | null;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the task ended with an error',
        required: false,
        nullable: true,
        example: false
    })
    @IsOptional()
    @IsBoolean()
    isError?: boolean;

    @ApiProperty({
        type: String,
        description: 'Error message if the task failed',
        required: false,
        nullable: true,
        example: null
    })
    @IsOptional()
    @IsString()
    errorReason?: string | null;

    @ApiProperty({
        type: String,
        description: 'User ID who initiated the task. Only tasks with non-null interception are visible via API.',
        required: false,
        nullable: true,
        example: '69b00a309fe1408d21bea39a'
    })
    @IsOptional()
    @IsString()
    interception?: string | null;

    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        nullable: true,
        example: null
    })
    @IsOptional()
    @IsString()
    id?: string | null;
}

export class RestartTaskDTO {
    @ApiProperty({
        type: String,
        description: 'Identifier of the task to restart',
        required: true,
        example: Examples.UUID
    })
    @IsString()
    taskId: string;
}
