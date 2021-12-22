import { Request, Response, Router } from 'express';
import { getMongoRepository } from 'typeorm';
import { User } from '@entity/user';
import { HederaHelper } from 'vc-modules';

/**
 * Route for demo api
 */
export const demoAPI = Router();

demoAPI.get('/all-users', async (req: Request, res: Response) => {
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

demoAPI.get('/random-key', async (req: Request, res: Response) => {
    try {
        const OPERATOR_ID = process.env.OPERATOR_ID;
        const OPERATOR_KEY = process.env.OPERATOR_KEY;
        const treasury = await HederaHelper.setOperator(OPERATOR_ID, OPERATOR_KEY).SDK.newAccount(40);
        res.status(200).json({
            id: treasury.id.toString(),
            key: treasury.key.toString()
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: error });
    }
});