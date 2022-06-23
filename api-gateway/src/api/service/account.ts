import { Request, Response, Router } from 'express';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper, authorizationHelper } from '@auth/authorizationHelper';
import { UserRole } from '@guardian/interfaces';
import { Users } from '@helpers/users';
import { Logger } from '@guardian/common';

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
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

accountAPI.post('/register', async (req: Request, res: Response) => {
    const users = new Users();
    try {
        let { username, password, role } = req.body;
        // @deprecated 2022-10-01
        if (role === 'ROOT_AUTHORITY') {
            role = UserRole.STANDARD_REGISTRY;
        }
        res.status(201).json(await users.registerNewUser(username, password, role));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

accountAPI.post('/login', async (req: Request, res: Response) => {
    const users = new Users();
    try {
        const { username, password } = req.body;
        res.status(200).json(await users.generateNewToken(username, password));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(error.code).send({ code: error.code, message: error.message });
    }
});

accountAPI.get('/', authorizationHelper, permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = new Users();
        res.status(200).json(await users.getAllUserAccounts());
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

/**
 * @deprecated 2022-10-01
 */
accountAPI.get('/root-authorities', authorizationHelper, async (req: Request, res: Response) => {
    try {
        const users = new Users();
        const standardRegistries = await users.getAllStandardRegistryAccounts();
        res.json(standardRegistries);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.json('null');
    }
});

accountAPI.get('/standard-registries', authorizationHelper, async (req: Request, res: Response) => {
    try {
        const users = new Users();
        const standardRegistries = await users.getAllStandardRegistryAccounts();
        res.json(standardRegistries);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.json('null');
    }
});
