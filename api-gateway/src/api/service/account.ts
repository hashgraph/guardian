import { NextFunction, Request, Response, Router } from 'express';
import { authorizationHelper, permissionHelper } from '@auth/authorization-helper';
import { Users } from '@helpers/users';
import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { SchemaEntity, UserRole } from '@guardian/interfaces';
import validate, { prepareValidationResponse } from '@middlewares/validation';
import { loginSchema, registerSchema } from '@middlewares/validation/schemas/accounts';
import { PolicyEngine } from '@helpers/policy-engine';
import { PolicyListResponse } from '@entities/policy';
import { StandardRegistryAccountResponse } from '@entities/account';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { LoginUserDTO, RegisterUserDTO } from '@middlewares/validation/schemas/accounts';

/**
 * User account route
 */
@Controller('accounts')
export class AccountApi {

    constructor(@Inject('GUARDIANS') public readonly client: ClientProxy) {
    }

    /**
     * getSession
     * @param headers
     */
    @Get('/session')
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() body: RegisterUserDTO): Promise<any> {
        const users = new Users();
        try {
            const {username, password} = body;
            let {role} = body;
            // @deprecated 2022-10-01
            if (role === 'ROOT_AUTHORITY') {
                role = UserRole.STANDARD_REGISTRY;
            }
            return await users.registerNewUser(username, password, role);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error.message.includes('already exists')) {
                throw new HttpException('An account with the same name already exists.', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            throw error;
        }
    }

    /**
     * Login
     */
    @Post('/login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginUserDTO): Promise<any> {
        const users = new Users();
        try {
            const {username, password} = body;
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
    @HttpCode(HttpStatus.OK)
    async getAllAccounts(@Req() req): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const users = new Users();
            return await users.getAllUserAccounts();
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get root authorities
     * @deprecated 2022-10-01
     */
    @Get('/root-authorities')
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
    async getStandatdRegistries(): Promise<any> {
        try {
            const users = new Users();
            return await users.getAllStandardRegistryAccounts();
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get aggregated SAs
     */
    @Get('/standard-registries/aggregated')
    @HttpCode(HttpStatus.OK)
    async getAggregatedStandardRegistries(): Promise<any> {
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
            });
            return await Promise.all(promises);
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/balance')
    @HttpCode(HttpStatus.OK)
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
