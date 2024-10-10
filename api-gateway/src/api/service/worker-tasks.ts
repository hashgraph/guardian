import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Response } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Auth, AuthUser } from '#auth';
import { Examples, InternalServerErrorDTO, pageHeader, WorkersTasksDTO } from '#middlewares';
import { IAuthUser } from '@guardian/common';
import { Guardians, parseInteger } from '#helpers';

@Controller('worker-tasks')
@ApiTags('worker-tasks')
export class WorkerTasksController{
    /**
     * Get all notifications
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
    @ApiOkResponse({
        description: 'Successful operation. Returns notifications and count.',
        isArray: true,
        headers: pageHeader,
        type: WorkersTasksDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(WorkersTasksDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getAllWorkerTasks(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ) {
        const guardians = new Guardians();
        const [tasks, count] = await guardians.getAllWorkerTasks(user, parseInteger(pageIndex), parseInteger(pageSize));
        res.header('X-Total-Count', count).send(tasks);
    }

    @Auth()
    @ApiOperation({
        summary: 'Restart task',
        description: 'Restart task'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns notifications.',
        isArray: false,
        type: null
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @Post('restart')
    async restartTask(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ) {
        const guardians = new Guardians();
        await guardians.restartTask(body.taskId, user.id.toString());
    }

    @Auth()
    @ApiOperation({
        summary: 'Delete task',
        description: 'Delete task'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns notifications.',
        isArray: false,
        type: null
    })
    @ApiParam({
        name: 'taskId',
        type: String,
        description: 'Task Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @Delete('delete/:taskId')
    async deleteTask(
        @AuthUser() user: IAuthUser,
        @Param('taskId') taskId: string,
    ) {
        const guardians = new Guardians();
        await guardians.deleteTask(taskId, user.id.toString());
    }
}
