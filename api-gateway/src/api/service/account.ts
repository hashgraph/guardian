import { Request, Response, Router } from 'express';
import { permissionHelper, authorizationHelper } from '@auth/authorization-helper';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { UserRole } from '@guardian/interfaces';

/**
 * User account route
 */
export const accountAPI = Router();

accountAPI.get('/session', async (req: Request, res: Response) => {
    const users = new Users();
    try {
        const authHeader = req.headers.authorization;
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
        const { username, password } = req.body;
        let { role } = req.body;
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
        res.status(404).send({ code: 404, message: error });
    }
});

accountAPI.get('/', authorizationHelper, permissionHelper(UserRole.STANDARD_REGISTRY),async (req: AuthenticatedRequest, res: Response) => {
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

accountAPI.get('/balance', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        const users = new Users();
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const user = await users.getUserByToken(token) as any;
                if (user) {
                    const guardians = new Guardians();
                    const balance = await guardians.getBalance(user.username);
                    res.json(balance);
                    return;
                } else {
                    res.json('null');
                    return;
                }
            } catch (error) {
                res.json('null');
                return;
            }
        }
        res.json('null');
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.json('null');
    }
});
