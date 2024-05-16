import { Users } from '../../helpers/users.js';
import { IAuthUser, Logger, NotificationHelper } from '@guardian/common';
import { Guardians } from '../../helpers/guardians.js';
import { SchemaEntity, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '../../helpers/policy-engine.js';
import { PolicyListResponse } from '../../entities/policy.js';
import { StandardRegistryAccountResponse } from '../../entities/account.js';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { checkPermission } from '../../auth/authorization-helper.js';
import { AccountsResponseDTO, AccountsSessionResponseDTO, AggregatedDTOItem, BalanceResponseDTO, LoginUserDTO, RegisterUserDTO } from '../../middlewares/validation/schemas/accounts.js';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { ApplicationEnvironment } from '../../environment.js';
import { CACHE } from '../../constants/index.js';
import { UseCache } from '../../helpers/decorators/cache.js';
import { Auth } from '../../auth/auth.decorator.js';

/**
 * User account route
 */
@Controller('accounts')
@ApiTags('accounts')
export class AccountApi {

  constructor(@Inject('GUARDIANS') public readonly client: ClientProxy) {
  }

    /**
     * getSession
     * @param headers
     */
    @ApiOperation({
        summary: 'Returns current session of the user.',
        description: 'Returns current user session.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(AccountsSessionResponseDTO),
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @Get('/session')
    @UseCache()
    async getSession(@Headers() headers: { [key: string]: string }): Promise<AccountsSessionResponseDTO> {
        const users = new Users();
        try {
            const authHeader = headers.authorization;
            const token = authHeader?.split(' ')[1];
            return await users.getUserByToken(token) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return null;
            // throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * register
     * @param body
     */
    @ApiOperation({
        summary: 'Registers a new user account.',
        description: 'Object that contain username, password and role (optional) fields.',
    })
    @ApiExtraModels(AccountsResponseDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(AccountsResponseDTO),
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() body: RegisterUserDTO, @Req() req: any): Promise<AccountsResponseDTO> {
        const users = new Users();
        if (!ApplicationEnvironment.demoMode) {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(' ')[1];
            let user;
            try {
                user = await users.getUserByToken(token) as IAuthUser;
            } catch (e) {
                user = null;
            }

            if (!user) {
                throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
            }
            try {
                await checkPermission(UserRole.STANDARD_REGISTRY)(user);
            } catch (error) {
                new Logger().error(error.message, ['API_GATEWAY']);
                throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
        try {
            const {username, password} = body;
            let {role} = body;
            // @deprecated 2022-10-01
            if (role === 'ROOT_AUTHORITY') {
                role = UserRole.STANDARD_REGISTRY;
            }
            const user = (await users.registerNewUser(
                username,
                password,
                role
            )) as any;
            await NotificationHelper.info(
                'Welcome to guardian',
                'Next register your account in hedera',
                user.id,
            );
            return user;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error.message.includes('already exists')) {
                throw new HttpException('An account with the same name already exists.', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Login
     */
    @ApiOperation({
        summary: 'Logs user into the system.',
    })
    @ApiExtraModels(AccountsSessionResponseDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(AccountsSessionResponseDTO),
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginUserDTO): Promise<AccountsSessionResponseDTO> {
        const users = new Users();
        try {
            const {username, password} = body;
            return await users.generateNewToken(username, password) as any;
        } catch (error) {
            new Logger().warn(error.message, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }
    }

    @ApiOperation({
        summary: 'Returns access token.',
        description: 'Returns access token.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        // schema: {
        //     $ref: getSchemaPath(AccountsResponseDTO),
        // },
    })
    @Post('access-token')
    async getAccessToken(@Body() body: any): Promise<any> {
        try {
            const {refreshToken} = body;
            const users = new Users();
            const {accessToken} = await users.generateNewAccessToken(refreshToken);
            if (!accessToken) {
                throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
            }
            return {
                accessToken
            }
        } catch (e) {
            throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * Accounts
     */
    @ApiOperation({
        summary: 'Returns a list of users, excluding Standard Registry and Auditors.',
        description: 'Returns all users except those with roles Standard ' +
            'Registry and Auditor. Only users with the Standard ' +
            'Registry role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(AccountsResponseDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(AccountsResponseDTO),
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get()
    @UseCache()
    @Auth(UserRole.STANDARD_REGISTRY)
    async getAllAccounts(@Req() req): Promise<AccountsResponseDTO[]> {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        const users = new Users();
        let user;
        try {
            user = await users.getUserByToken(token) as IAuthUser;
        } catch (e) {
            user = null;
        }

        if (!user) {
            throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
        }
        try {
            return await users.getAllUserAccounts() as any[];
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get SAs
     */
    @ApiOperation({
        summary: 'Returns all Standard Registries.',
        description: 'Returns all Standard Registries.'
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(AccountsResponseDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(AccountsResponseDTO),
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get('/standard-registries')
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getStandatdRegistries(@Req() req): Promise<any> {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        const users = new Users();
        let user;
        try {
            user = await users.getUserByToken(token) as IAuthUser;
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.UNAUTHORIZED);
        }
        if (!user) {
            throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
        }
        try {
            await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER, UserRole.AUDITOR)(user);
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.FORBIDDEN);
        }
        try {
            return await users.getAllStandardRegistryAccounts();
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get aggregated SAs
     */
    @ApiOperation({
        summary: 'Returns all Standard Registries aggregated with polices and vcDocuments.',
        description: 'Returns all Standard Registries aggregated with polices and vcDocuments'
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(AggregatedDTOItem, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                '$ref': getSchemaPath(AggregatedDTOItem)
            }
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get('/standard-registries/aggregated')
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getAggregatedStandardRegistries(): Promise<any> {
        const engineService = new PolicyEngine();
        const guardians = new Guardians();
        try {
            const users = new Users();
            const standardRegistries = await users.getAllStandardRegistryAccounts() as StandardRegistryAccountResponse[];
            const promises = standardRegistries.filter(({did, username}) => !!did && !!username)
                .map(async ({did, username}) => {
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

    /**
     * @param headers
     */
    @ApiOperation({
        summary: 'Returns user\'s Hedera account balance.',
        description: 'Requests current Hedera account balance.'
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(BalanceResponseDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(BalanceResponseDTO)
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Get('/balance')
    @HttpCode(HttpStatus.OK)
    @UseCache({ ttl: CACHE.SHORT_TTL })
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
                    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)

                } catch (error) {
                    throw new HttpException(error.message, HttpStatus.UNAUTHORIZED)
                }
            }
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
