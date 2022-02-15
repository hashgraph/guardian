import { Request, Response, Router } from 'express';
import { getMongoRepository } from 'typeorm';
import { User } from '@entity/user';
import { HederaHelper } from 'vc-modules';
import { Guardians } from '@helpers/guardians';

/**
 * Route for demo api
 */
export const demoAPI = Router();

demoAPI.get('/registeredUsers', async (req: Request, res: Response) => {
    try {
        const users = await getMongoRepository(User).find();
        res.json(users.map(e => ({
            username: e.username,
            role: e.role
        })));
    } catch (e) {
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

demoAPI.get('/randomKey', async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const demoKey = await guardians.generateDemoKey();
        res.status(200).json(demoKey);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});