import { NextFunction, Request, Response, Router } from 'express';
import { authorizationHelper, permissionHelper } from '@auth/authorization-helper';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { SchemaEntity, UserRole } from '@guardian/interfaces';
import validate, { prepareValidationResponse } from '@middlewares/validation';
import { loginSchema, registerSchema } from '@middlewares/validation/schemas/accounts';
import { PolicyEngine } from '@helpers/policy-engine';
import { PolicyListResponse } from '@entities/policy';
import { StandardRegistryAccountResponse } from '@entities/account';

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

accountAPI.get('/standard-registries/aggregated', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
    const engineService = new PolicyEngine();
    const guardians = new Guardians();
    try {
        const users = new Users();
        const standardRegistries = await users.getAllStandardRegistryAccounts() as StandardRegistryAccountResponse[];
        const promises = standardRegistries.filter(({ did, username }) => !!did && !!username)
          .map(async ({ did, username }) => {
            let vcDocument = {};
            const user = await users.getUser(username);
            const vcDocuments = await guardians.getVcDocuments({
                owner: did,
                type: SchemaEntity.STANDARD_REGISTRY
            });
            if (vcDocuments && vcDocuments.length) {
                vcDocument = vcDocuments[vcDocuments.length - 1];
            }
            const { policies } = await engineService.getPolicies(
              { filters: { owner: did }, userDid: did }
            ) as PolicyListResponse;
            return {
                did,
                vcDocument,
                policies,
                username,
                hederaAccountId: user.hederaAccountId
            }
        })
        res.json(await Promise.all(promises));
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
