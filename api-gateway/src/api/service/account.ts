import { IAuthUser, Logger, NotificationHelper } from '@guardian/common';
import { Permissions, PolicyType, SchemaEntity, UserRole } from '@guardian/interfaces';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsResponseDTO, AccountsSessionResponseDTO, AggregatedDTOItem, BalanceResponseDTO, InternalServerErrorDTO, LoginUserDTO, RegisterUserDTO } from '#middlewares';
import { Auth, AuthUser, checkPermission } from '#auth';
import { EntityOwner, Guardians, InternalException, PolicyEngine, UseCache, Users } from '#helpers';
import { PolicyListResponse } from '../../entities/policy.js';
import { StandardRegistryAccountResponse } from '../../entities/account.js';
import { ApplicationEnvironment } from '../../environment.js';
import { CACHE } from '../../constants/index.js';

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
    @Get('/session')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Returns current session of the user.',
        description: 'Returns current user session.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccountsSessionResponseDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(AccountsSessionResponseDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getSession(
        @Headers() headers: { [key: string]: string },
    ): Promise<AccountsSessionResponseDTO> {
        const users = new Users();
        try {
            const authHeader = headers.authorization;
            const token = authHeader?.split(' ')[1];
            return await users.getUserByToken(token) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return null;
        }
    }

    /**
     * register
     * @param body
     */
    @Post('/register')
    @ApiOperation({
        summary: 'Registers a new user account.',
        description: 'Object that contain username, password and role (optional) fields.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccountsResponseDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(AccountsResponseDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() body: RegisterUserDTO,
        @Req() req: any
    ): Promise<AccountsResponseDTO> {
        const users = new Users();
        if (!ApplicationEnvironment.demoMode) {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(' ')[1];
            let user: IAuthUser | null;
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
                await InternalException(error);
            }
        }
        try {
            const { role, username, password } = body;
            const user = (await users.registerNewUser(username, password, role));
            await NotificationHelper.info(
                'Welcome to guardian',
                'Next register your account in hedera',
                user.id,
            );
            return user;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error.message.includes('already exists')) {
                throw new HttpException(error.message, HttpStatus.CONFLICT);
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Login
     */
    @Post('/login')
    @ApiOperation({
        summary: 'Logs user into the system.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccountsSessionResponseDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(AccountsSessionResponseDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() body: LoginUserDTO
    ): Promise<AccountsSessionResponseDTO> {
        try {
            const { username, password } = body;
            const users = new Users();
            return await users.generateNewToken(username, password) as any;
        } catch (error) {
            new Logger().warn(error.message, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * Get Access Token
     */
    @Post('access-token')
    @ApiOperation({
        summary: 'Returns access token.',
        description: 'Returns access token.'
    })
    @ApiOkResponse({
        description: 'Successful operation.'
    })
    async getAccessToken(
        @Body() body: any
    ): Promise<any> {
        try {
            const { refreshToken } = body;
            const users = new Users();
            const { accessToken } = await users.generateNewAccessToken(refreshToken);
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
    @Get('/')
    @Auth(
        Permissions.ACCOUNTS_ACCOUNT_READ
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns a list of users, excluding Standard Registry and Auditors.',
        description: 'Returns all users except those with roles Standard ' +
            'Registry and Auditor. Only users with the Standard ' +
            'Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccountsResponseDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(AccountsResponseDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getAllAccounts(): Promise<AccountsResponseDTO[]> {
        try {
            return await (new Users()).getAllUserAccounts();
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get Standard Registries
     */
    @Get('/standard-registries')
    @Auth(
        Permissions.ACCOUNTS_STANDARD_REGISTRY_READ
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Returns all Standard Registries.',
        description: 'Returns all Standard Registries.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccountsResponseDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(AccountsResponseDTO, InternalServerErrorDTO)
    // @UseCache()
    @HttpCode(HttpStatus.OK)
    async getStandardRegistries(): Promise<any> {
        try {
            return await (new Users()).getAllStandardRegistryAccounts();
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get aggregated standard registries
     */
    @Get('/standard-registries/aggregated')
    @Auth(
        Permissions.ACCOUNTS_STANDARD_REGISTRY_READ
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Returns all Standard Registries aggregated with polices and vcDocuments.',
        description: 'Returns all Standard Registries aggregated with polices and vcDocuments'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: AggregatedDTOItem
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(AggregatedDTOItem, InternalServerErrorDTO)
    // @UseCache()
    @HttpCode(HttpStatus.OK)
    async getAggregatedStandardRegistries(): Promise<any> {
        const engineService = new PolicyEngine();
        const guardians = new Guardians();
        try {
            const users = new Users();
            const standardRegistries = await users.getAllStandardRegistryAccounts() as StandardRegistryAccountResponse[];
            const promises = standardRegistries
                .filter(({ did, username }) => !!did && !!username)
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
                        {
                            filters: {
                                status: { $in: [PolicyType.PUBLISH, PolicyType.DISCONTINUED] }
                            },
                            userDid: did
                        },
                        EntityOwner.sr(did)
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
            await InternalException(error);
        }
    }

    /**
     * Get Hedera account balance
     */
    @Get('/balance')
    @Auth(
        Permissions.PROFILES_BALANCE_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.USER,
        // UserRole.AUDITOR
    )
    @ApiOperation({
        summary: 'Returns user\'s Hedera account balance.',
        description: 'Requests current Hedera account balance.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BalanceResponseDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BalanceResponseDTO, InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.SHORT_TTL })
    @HttpCode(HttpStatus.OK)
    async getBalance(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            return await (new Guardians()).getBalance(user.username);
        } catch (error) {
            await InternalException(error);
        }
    }
}
