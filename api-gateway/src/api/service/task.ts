import { IAuthUser } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiParam, ApiOperation, ApiExtraModels, ApiOkResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AuthUser, Auth } from '#auth';
import { Examples, InternalServerErrorDTO, TaskStatusDTO } from '#middlewares';
import { InternalException, TaskManager } from '#helpers';

@Controller('tasks')
@ApiTags('tasks')
export class TaskApi {
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
        type: TaskStatusDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
        }
    }
}
