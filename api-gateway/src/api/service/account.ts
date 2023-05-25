import { Request, Response, Router, NextFunction } from 'express';
import { permissionHelper, authorizationHelper } from '@auth/authorization-helper';
import { Users } from '@helpers/users';
import { AuthenticatedRequest, InboundMessageIdentityDeserializer, Logger, OutboundResponseIdentitySerializer, Singleton } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { MessageAPI, UserRole } from '@guardian/interfaces';
import validate, { prepareValidationResponse } from '@middlewares/validation';
import { registerSchema, loginSchema } from '@middlewares/validation/schemas/accounts';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
import { Controller, Get, Param, Headers, Post, Body, Inject } from '@nestjs/common';

/**
 * User account route
 */
@Controller('accounts')
export class AccountApi {

    constructor(@Inject('GUARDIANS') private readonly client: ClientProxy) {
    }

    /**
     * getSession
     * @param headers
     */
    @Get('/session')
    async getSession(@Headers() headers): Promise<any> {
        const users = new Users();
        try {
            const authHeader = headers.authorization;
            const token = authHeader.split(' ')[1];
            return await users.getUserByToken(token);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }

    }

    /**
     * register
     * @param body
     */
    @Post('/register')
    async register(@Body() body): Promise<any> {
        const users = new Users();
        try {
            const { username, password } = body;
            let { role } = body;
            // @deprecated 2022-10-01
            if (role === 'ROOT_AUTHORITY') {
                role = UserRole.STANDARD_REGISTRY;
            }
            return await users.registerNewUser(username, password, role);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            // if (error.message.includes('already exists')) {
            //     return res.status(422).json(prepareValidationResponse('An account with the same name already exists.'));
            // }
            throw error;
        }
    }

    /**
     * Login
     */
    @Post('/login')
    async login(@Body() body): Promise<any> {
        const users = new Users();
        try {
            const { username, password } = body;
            return await users.generateNewToken(username, password);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Accounts
     */
    @Get()
    async getAllAccounts(): Promise<any> {
        try {
            const users = new Users();
            return await users.getAllUserAccounts();
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Get root authorities
     * @deprecated 2022-10-01
     */
    @Get('/root-authorities')
    async getRootAuthorities(): Promise<any> {
        try {
            const users = new Users();
            return await users.getAllStandardRegistryAccounts();
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get SAs
     */
    @Get('/standard-registries')
    async getStandatdRegistries(): Promise<any> {
        try {
            const users = new Users();
            return await users.getAllStandardRegistryAccounts();
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/balance')
    async getBalance(@Headers() headers): Promise<any> {
        try {
            const authHeader = headers.authorization;
            const users = new Users();
            if (authHeader) {
                const token = authHeader.split(' ')[1];
                try {
                    const user = await users.getUserByToken(token) as any;
                    if (user) {
                        const guardians = new Guardians();
                        return await guardians.getBalance(user.username);
                        // const balance = await this.client.send(MessageAPI.GET_BALANCE, { username: user.username }).toPromise()
                        // return balance;
                    }
                    return {};

                } catch (error) {
                    return {};
                }
            }
            return {};
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
// export const accountAPI = Router();
//
// accountAPI.get('/session', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
//     const users = new Users();
//     try {
//         const authHeader = req.headers.authorization;
//         const token = authHeader.split(' ')[1];
//         res.json(await users.getUserByToken(token));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
//
// accountAPI.post('/register', validate(registerSchema()),async (req: Request, res: Response, next: NextFunction) => {
//     const users = new Users();
//     try {
//         const { username, password } = req.body;
//         let { role } = req.body;
//         // @deprecated 2022-10-01
//         if (role === 'ROOT_AUTHORITY') {
//             role = UserRole.STANDARD_REGISTRY;
//         }
//         res.status(201).json(await users.registerNewUser(username, password, role));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         if (error.message.includes('already exists')) {
//             return res.status(422).json(prepareValidationResponse('An account with the same name already exists.'));
//         }
//         next(error)
//     }
// });
//
// accountAPI.post('/login', validate(loginSchema()), async (req: Request, res: Response, next: NextFunction) => {
//     const users = new Users();
//     try {
//         const { username, password } = req.body;
//         res.json(await users.generateNewToken(username, password));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         next(error)
//     }
// });
//
// accountAPI.get('/', [authorizationHelper, permissionHelper(UserRole.STANDARD_REGISTRY)],
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const users = new Users();
//         res.json(await users.getAllUserAccounts());
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         next(error)
//     }
// });
//
// /**
//  * @deprecated 2022-10-01
//  */
// accountAPI.get('/root-authorities', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const users = new Users();
//         const standardRegistries = await users.getAllStandardRegistryAccounts();
//         res.json(standardRegistries);
//     } catch (error) {
//         new Logger().error(error.message, ['API_GATEWAY']);
//         return next(error)
//     }
// });
//
// accountAPI.get('/standard-registries', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const users = new Users();
//         const standardRegistries = await users.getAllStandardRegistryAccounts();
//         res.json(standardRegistries);
//     } catch (error) {
//         new Logger().error(error.message, ['API_GATEWAY']);
//         return next(error);
//     }
// });
//
// accountAPI.get('/balance', authorizationHelper, async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const client = ClientsModule.register([{
//                 name: 'profile-service',
//                 transport: Transport.NATS,
//                 options: {
//                     servers: [
//                         `nats://${process.env.MQ_ADDRESS}:4222`
//                     ],
//                     queue: 'profile-service',
//                     serializer: new OutboundResponseIdentitySerializer(),
//                     deserializer: new InboundMessageIdentityDeserializer(),
//                 }
//             }]);
//         const authHeader = req.headers.authorization;
//         const users = new Users();
//         if (authHeader) {
//             const token = authHeader.split(' ')[1];
//             try {
//                 const user = await users.getUserByToken(token) as any;
//                 if (user) {
//                     const guardians = new Guardians();
//                     const balance = await guardians.getBalance(user.username);
//                     return res.json(balance);
//                 }
//                 return res.json({});
//
//             } catch (error) {
//                 return res.json({});
//             }
//         }
//         res.json({});
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error)
//     }
// });
