import { Logger } from '@guardian/common';
import { TaskManager } from '../../helpers/task-manager.js';
import { Controller, Get, HttpCode, HttpStatus, Req, Response } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../auth/auth.decorator.js';
import { UserRole } from '@guardian/interfaces';

@Controller('tasks')
@ApiTags('tasks')
export class TaskApi {
    @Get('/:taskId')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getTask(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        try {
            const taskId = req.params.taskId;
            const taskState = taskManager.getState(req.user.id, taskId);
            return res.send(taskState);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
