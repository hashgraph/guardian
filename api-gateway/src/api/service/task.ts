import { Router, NextFunction } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { Controller, Get, Req, Response } from '@nestjs/common';

@Controller('tasks')
export class TaskApi {
    @Get('/:taskId')
    async getTask(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        try {
            const taskId = req.params.taskId;
            const taskState = taskManager.getState(taskId);
            return res.json(taskState);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}

// export const taskAPI = Router();
//
// taskAPI.get('/:taskId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const taskManager = new TaskManager();
//     try {
//         const taskId = req.params.taskId;
//         const taskState = taskManager.getState(taskId);
//         return res.json(taskState);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
