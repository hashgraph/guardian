import { Request, Response, Router } from 'express';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Logger } from '@guardian/common';

/**
 * Route for demo api
 */
export const demoAPI = Router();

demoAPI.get('/registeredUsers', async (req: Request, res: Response) => {
    const users = new Users();
    const guardians = new Guardians();
    try {
        const demoUsers: any = await users.getAllUserAccountsDemo();

        for (let i = 0; i < demoUsers.length; i++) {
            const element = demoUsers[i];
            if (element.did) {
                element.policyRoles = await guardians.getUserRoles(element.did);
            } else {
                element.policyRoles = [];
            }
        }

        res.json(demoUsers);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        console.error(error);
        res.status(500).send({ code: 500, message: error.message });
    }
});

demoAPI.get('/randomKey', async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const demoKey = await guardians.generateDemoKey();
        res.status(200).json(demoKey);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        console.error(error);
        res.status(500).json({ code: 500, message: error.message });
    }
});
