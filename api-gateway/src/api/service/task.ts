import { Logger } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { Controller, Get, HttpCode, HttpStatus, Req, Response } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('tasks')
@ApiTags('tasks')
export class TaskApi {
    @Get('/:taskId')
    @HttpCode(HttpStatus.OK)
    async getTask(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        try {
            const taskId = req.params.taskId;
            const taskState = taskManager.getState(req.user.id, taskId);
            return res.json(taskState);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
