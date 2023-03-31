import { Request, Response, Router, NextFunction } from 'express';
import { permissionHelper, authorizationHelper } from '@auth/authorization-helper';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { UserRole } from '@guardian/interfaces';
import validate, { prepareValidationResponse } from '@middlewares/validation';
import { registerSchema, loginSchema } from '@middlewares/validation/schemas/accounts';

/**
 * User account route
 */
export const accountAPI = Router();

accountAPI.get('/session', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
    const users = new Users();
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        res.json(await users.getUserByToken(token));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

accountAPI.post('/register', validate(registerSchema()),async (req: Request, res: Response, next: NextFunction) => {
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
        if (error.message.includes('already exists')) {
            return res.status(422).json(prepareValidationResponse('An account with the same name already exists.'));
        }
        next(error)
    }
});

accountAPI.post('/login', validate(loginSchema()), async (req: Request, res: Response, next: NextFunction) => {
    const users = new Users();
    try {
        const { username, password } = req.body;
        res.json(await users.generateNewToken(username, password));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        next(error)
    }
});

accountAPI.get('/', [authorizationHelper, permissionHelper(UserRole.STANDARD_REGISTRY)],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const users = new Users();
        res.json(await users.getAllUserAccounts());
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        next(error)
    }
});

/**
 * @deprecated 2022-10-01
 */
accountAPI.get('/root-authorities', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = new Users();
        const standardRegistries = await users.getAllStandardRegistryAccounts();
        res.json(standardRegistries);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        return next(error)
    }
});

accountAPI.get('/standard-registries', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = new Users();
        const standardRegistries = await users.getAllStandardRegistryAccounts();
        res.json(standardRegistries);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        return next(error);
    }
});

accountAPI.get('/balance', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
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
                    return res.json(balance);
                }
                return res.json({});

            } catch (error) {
                return res.json({});
            }
        }
        res.json({});
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error)
    }
});
