import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper, authorizationHelper } from '@auth/authorizationHelper';
import { UserRole } from 'interfaces';
import { Users } from '@helpers/users';
import { Logger } from 'logger-helper';

/**
 * User account route
 */
export const accountAPI = Router();

accountAPI.get('/session', async (req: Request, res: Response) => {
    const users = new Users();
    try {
        let authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            res.status(200).json(await users.getUserByToken(token));
        } else {
            res.sendStatus(401);
        }
    } catch (e) {
        new Logger().error(e.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: e.message });
    }
});

accountAPI.post('/register', async (req: Request, res: Response) => {
    const users = new Users();
    try {
        const { username, password, role } = req.body;
        res.status(201).json(await users.registerNewUser(username, password, role));
    } catch (e) {
        new Logger().error(e.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

accountAPI.post('/login', async (req: Request, res: Response) => {
    const users = new Users();
    try {
        const { username, password } = req.body;
        const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

        res.status(200).json(await users.generateNewToken(username, password));
    } catch (e) {
        new Logger().error(e.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});


accountAPI.get('/', authorizationHelper, permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = new Users();
        res.status(200).json(await users.getAllUserAccounts());
    } catch (e) {
        new Logger().error(e.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});
