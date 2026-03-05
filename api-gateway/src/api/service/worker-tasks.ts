import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Response } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Auth, AuthUser } from '#auth';
import { Examples, InternalServerErrorDTO, pageHeader, WorkersTasksDTO } from '#middlewares';
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
        summary: 'Get all worker tasks',
        description: 'Returns all worker tasks.',
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
        description: 'Status',
        required: false,
        example: 'NEW'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns worker tasks and count.',
        isArray: true,
        headers: pageHeader,
        type: WorkersTasksDTO,
        example: [{ createDate: 'string', done: true, id: 'f3b2a9c1e4d5678901234567', isRetryableTask: true, processedTime: 'string', sent: true, taskId: 'f3b2a9c1e4d5678901234567', type: 'string', updateDate: 'string' }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(WorkersTasksDTO, InternalServerErrorDTO)
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
        summary: 'Restart task',
        description: 'Restart task.',
    })
    @ApiBody({
        description: 'Task restart request payload.',
        required: true,
        schema: {
            type: 'object',
            required: ['taskId'],
            properties: {
                taskId: {
                    type: 'string',
                    description: 'Worker task identifier',
                    example: Examples.DB_ID
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Task restart request accepted. Empty response body.',
        schema: {
            type: 'object',
            nullable: true,
            example: null
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async restartTask(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ) {
        const guardians = new Guardians();
        await guardians.restartTask(body.taskId, user.id.toString());
    }

    @Delete('delete/:taskId')
    @Auth()
    @ApiOperation({
        summary: 'Delete task',
        description: 'Delete task.',
    })
    @ApiParam({
        name: 'taskId',
        type: String,
        description: 'Task Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Task deleted. Empty response body.',
        schema: {
            type: 'object',
            nullable: true,
            example: null
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteTask(
        @AuthUser() user: IAuthUser,
        @Param('taskId') taskId: string,
    ) {
        const guardians = new Guardians();
        await guardians.deleteTask(taskId, user.id.toString());
    }
}
