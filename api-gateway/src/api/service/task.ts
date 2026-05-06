import { IAuthUser, PinoLogger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, HttpException, Param } from '@nestjs/common';
import { ApiTags, ApiParam, ApiOperation, ApiExtraModels, ApiOkResponse, ApiInternalServerErrorResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
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
        examples: {
            default: {
                summary: 'Default example',
                value: { action: 'Create policy', userId: Examples.DB_ID, expectation: 0, taskId: Examples.DB_ID, date: 'string', statuses: [{ message: 'string', type: 'Info' }], result: {}, error: {} }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
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

    /**
     * Get user onboard task status
     */
    @Get('/onboard/:taskId')
    @ApiOperation({
        summary: 'Returns task status of user onboarding by Id without authentication.',
        description:
            'Returns task status of user onboarding by Id. No Bearer token required.',
    })
    @ApiParam({
        name: 'taskId',
        type: String,
        description: 'Task Id returned by the initiating endpoint',
        required: true,
        example: Examples.UUID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskStatusDTO,
    })
    @ApiUnauthorizedResponse({
        description: 'Task exists but is not an onboarding task.',
        type: InternalServerErrorDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(TaskStatusDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTaskStatus(
        @Param('taskId') taskId: string,
    ): Promise<any> {
        try {
            const taskManager = new TaskManager();
            return taskManager.getOnboardingTask(taskId);
        } catch (error) {
            if (error?.code === 'TASK_NOT_ONBOARDING') {
                throw new HttpException(
                    'Unauthorized: this API only exposes onboarding tasks.',
                    HttpStatus.UNAUTHORIZED,
                );
            }
            await InternalException(error, this.logger, null);
        }
    }
}
