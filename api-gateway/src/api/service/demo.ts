import { Request, Response, Router } from 'express';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Logger } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';

/**
 * Route for demo api
 */
export const demoAPI = Router();

demoAPI.get('/registeredUsers', async (req: Request, res: Response) => {
    const users = new Users();
    const guardians = new Guardians();
    try {
        const demoUsers: any = await users.getAllUserAccountsDemo();

        for (const element of demoUsers) {
            if (element.did) {
                element.policyRoles = await guardians.getUserRoles(element.did);
            } else {
                element.policyRoles = [];
            }
        }

        res.json(demoUsers);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

demoAPI.get('/randomKey', async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        let role = null;
        try {
            const authHeader = req?.headers?.authorization;
            if (authHeader) {
                const users = new Users();
                const token = authHeader.split(' ')[1];
                const user = await users.getUserByToken(token) as any;
                role = user?.role;
            }
        } catch (error) {
            role = null;
        }
        const demoKey = await guardians.generateDemoKey(role);
        res.status(200).json(demoKey);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

demoAPI.get('/push/randomKey', async (req: Request, res: Response) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Create random key');

    const authHeader = req?.headers?.authorization;
    setImmediate(async () => {
        try {
            const guardians = new Guardians();
            let role = null;
            if (authHeader) {
                try {
                    const users = new Users();
                    const token = authHeader.split(' ')[1];
                    const user = await users.getUserByToken(token) as any;
                    role = user?.role;
                } catch (error) {
                    role = null;
                }
            }

            await guardians.generateDemoKeyAsync(role, taskId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        }
    });

    res.status(201).send({ taskId, expectation });
});
