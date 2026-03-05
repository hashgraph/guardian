import { IAuthUser, PinoLogger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiParam, ApiOperation, ApiExtraModels, ApiOkResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { Examples, InternalServerErrorDTO, TaskStatusDTO } from '#middlewares';
import { InternalException, TaskManager } from '#helpers';

@Controller('tasks')
@ApiTags('tasks')
export class TaskApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Get status
     */
    @Get('/:taskId')
    @Auth()
    @ApiOperation({
        summary: 'Returns task statuses by Id.',
        description: 'Returns task statuses by Id.',
    })
    @ApiParam({
        name: 'taskId',
        type: String,
        description: 'Task Id',
        required: true,
        example: Examples.UUID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskStatusDTO,
        example: { action: 'Create policy', userId: 'f3b2a9c1e4d5678901234567', expectation: 0, taskId: 'f3b2a9c1e4d5678901234567', date: 'string', statuses: [{ message: 'string', type: 'Info' }], result: {}, error: {} }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(TaskStatusDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTask(
        @AuthUser() user: IAuthUser,
        @Param('taskId') taskId: string,
    ): Promise<any> {
        try {
            const taskManager = new TaskManager();
            return taskManager.getState(user.id, taskId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
