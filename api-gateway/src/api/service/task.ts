import { Response, Router, NextFunction } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';

export const taskAPI = Router();

taskAPI.get('/:taskId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const taskManager = new TaskManager();
    try {
        const taskId = req.params.taskId;
        const taskState = taskManager.getState(taskId);
        return res.json(taskState);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});
