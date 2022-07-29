import { Response, Router } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';

export const taskAPI = Router();

taskAPI.get('/:taskId', async (req: AuthenticatedRequest, res: Response) => {
    const taskManager = new TaskManager();
    try {
        const taskId = req.params.taskId;
        const taskState = taskManager.getState(taskId);
        res.status(200).json(taskState);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: error.code || 500, message: error.message });
    }
});