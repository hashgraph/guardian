import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class TaskDTO {
    @ApiProperty({
        type: 'string',
        description: 'Task Id',
        example: Examples.UUID
    })
    taskId: string;

    @ApiProperty({
        type: 'number',
        description: 'Expected count of task phases',
        example: 0
    })
    expectation: number;
}

export class StatusDTO {
    @ApiProperty({
        type: 'string',
        description: 'Text',
    })
    message: string;

    @ApiProperty({
        type: 'string',
        description: 'Type',
        enum: [
            'Processing',
            'Completed',
            'Info'
        ],
        example: 'Info'
    })
    type: string;
}

@ApiExtraModels(StatusDTO)
export class TaskStatusDTO {
    @ApiProperty({
        type: 'string',
        description: 'Task type',
        example: 'Create policy'
    })
    action: string;

    @ApiProperty({
        type: 'string',
        description: 'User Id',
        example: Examples.DID
    })
    userId: string;

    @ApiProperty({
        type: 'number',
        description: 'Expected count of task phases',
        example: 0
    })
    expectation: number;

    @ApiProperty({
        type: 'string',
        description: 'Task Id',
        example: Examples.UUID
    })
    taskId: string;

    @ApiProperty({
        type: 'string',
        description: 'Date',
        example: Examples.DATE
    })
    date: string;

    @ApiProperty({
        type: () => StatusDTO,
        isArray: true,
    })
    statuses: StatusDTO[];

    @ApiProperty({ type: 'object' })
    result: any;

    @ApiProperty({ type: 'object' })
    error: any;
}