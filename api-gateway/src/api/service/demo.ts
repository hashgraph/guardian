import { Request, Response, Router } from 'express';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Logger } from 'logger-helper';

/**
 * Route for demo api
 */
export const demoAPI = Router();

demoAPI.get('/registeredUsers', async (req: Request, res: Response) => {
    const users = new Users();
    try {
        res.json(await users.getAllUserAccountsDemo());
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
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
        new Logger().error(error.toString(), ['API_GATEWAY']);
        console.error(error);
        res.status(500).json({ code: 500, message: error.message });
    }
});
