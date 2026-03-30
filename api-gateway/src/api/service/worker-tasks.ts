import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Response } from '@nestjs/common';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Auth, AuthUser } from '#auth';
import { Examples, InternalServerErrorDTO, ObjectExamples, pageHeader, RestartTaskDTO, WorkersTasksDTO } from '#middlewares';
import { IAuthUser } from '@guardian/common';
import { Guardians, parseInteger } from '#helpers';

@Controller('worker-tasks')
@ApiTags('worker-tasks')
export class WorkerTasksController {
    /**
     * Get all worker tasks
     */
    @Get('/')
    @Auth()
    @ApiOperation({
        summary: 'Get all worker tasks.',
        description: 'Returns a paginated list of all background worker tasks (IPFS uploads, Hedera transactions, etc.). Use query parameters to filter by status and paginate results.',
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'status',
        type: String,
        description: 'Filter by task status. COMPLETE = done tasks, ERROR = failed tasks, PROCESSING = sent but not done, IN QUEUE = not yet sent. Leave empty for all tasks.',
        required: false,
        enum: ['COMPLETE', 'ERROR', 'PROCESSING', 'IN QUEUE'],
        example: ''
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns worker tasks array and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: WorkersTasksDTO,
        examples: {
            complete: {
                summary: 'COMPLETE — task finished successfully',
                value: [ObjectExamples.WORKER_TASK_COMPLETE]
            },
            error: {
                summary: 'ERROR — task failed with error',
                value: [ObjectExamples.WORKER_TASK_ERROR]
            },
            processing: {
                summary: 'PROCESSING — task sent to worker, not yet done',
                value: [ObjectExamples.WORKER_TASK_PROCESSING]
            },
            inQueue: {
                summary: 'IN QUEUE — task waiting to be sent',
                value: [ObjectExamples.WORKER_TASK_IN_QUEUE]
            },
            empty: {
                summary: 'No worker tasks',
                value: []
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            timeout: {
                summary: 'Queue service not responding (NATS timeout)',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getAllWorkerTasks(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('status') status?: string
    ) {
        const guardians = new Guardians();
        const [tasks, count] = await guardians.getAllWorkerTasks(user, parseInteger(pageIndex), parseInteger(pageSize), status);
        res.header('X-Total-Count', count).send(tasks);
    }

    @Post('restart')
    @Auth()
    @ApiOperation({
        summary: 'Restart a worker task.',
        description: 'Restarts a failed or stuck worker task by its task ID. Only retryable tasks can be restarted. Note: if the taskId does not exist, the request may timeout due to a backend error.'
    })
    @ApiBody({
        description: 'Object containing the task ID to restart.',
        required: true,
        type: RestartTaskDTO,
        examples: {
            restartTask: {
                value: { taskId: Examples.UUID }
            }
        }
    })
    @ApiOkResponse({
        description: 'Task restarted successfully. Empty response body.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            wrongUser: {
                summary: 'Task belongs to another user',
                value: { statusCode: 500, message: 'Wrong user' }
            },
            taskNotFound: {
                summary: 'Task ID does not exist (may timeout instead)',
                value: { statusCode: 500, message: 'Cannot read properties of null (reading \'userId\')' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async restartTask(
        @AuthUser() user: IAuthUser,
        @Body() body: RestartTaskDTO
    ) {
        const guardians = new Guardians();
        await guardians.restartTask(body.taskId, user.id.toString());
    }

    @Delete('delete/:taskId')
    @Auth()
    @ApiOperation({
        summary: 'Delete a worker task.',
        description: 'Permanently deletes a worker task by its task ID. Note: if the taskId does not exist, the request may timeout due to a backend error.'
    })
    @ApiParam({
        name: 'taskId',
        type: String,
        description: 'The unique identifier of the worker task to delete',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Task deleted successfully. Empty response body.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            wrongUser: {
                summary: 'Task belongs to another user',
                value: { statusCode: 500, message: 'Wrong user' }
            },
            taskNotFound: {
                summary: 'Task ID does not exist (may timeout instead)',
                value: { statusCode: 500, message: 'Cannot read properties of null (reading \'userId\')' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async deleteTask(
        @AuthUser() user: IAuthUser,
        @Param('taskId') taskId: string,
    ) {
        const guardians = new Guardians();
        await guardians.deleteTask(taskId, user.id.toString());
    }
}
