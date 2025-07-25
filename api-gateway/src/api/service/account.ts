import { IAuthUser, NotificationHelper, PinoLogger } from '@guardian/common';
import { Permissions, PolicyStatus, SchemaEntity, UserRole } from '@guardian/interfaces';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsResponseDTO, AccountsSessionResponseDTO, AggregatedDTOItem, BalanceResponseDTO, ChangePasswordDTO, InternalServerErrorDTO, LoginUserDTO, RegisterUserDTO } from '#middlewares';
import { Auth, AuthUser, checkPermission } from '#auth';
import { EntityOwner, Guardians, InternalException, PolicyEngine, UseCache, Users } from '#helpers';
import { PolicyListResponse } from '../../entities/policy';
import { StandardRegistryAccountResponse } from '../../entities/account';
import { ApplicationEnvironment } from '../../environment.js';
import { CACHE } from '#constants';

/**
 * User account route
 */
@Controller('accounts')
@ApiTags('accounts')
export class AccountApi {

    constructor(@Inject('GUARDIANS') public readonly client: ClientProxy, private readonly logger: PinoLogger) {
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
            await this.logger.error(error, ['API_GATEWAY'], null);
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
        let parentUser: IAuthUser | null;

        if (!ApplicationEnvironment.demoMode) {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(' ')[1];

            try {
                parentUser = await users.getUserByToken(token) as IAuthUser;
            } catch (e) {
                parentUser = null;
            }
            if (!parentUser) {
                throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
            }
            try {
                await checkPermission(UserRole.STANDARD_REGISTRY)(parentUser);
            } catch (error) {
                await InternalException(error, this.logger, parentUser?.id);
            }
        }
        try {
            const { role, username, password } = body;
            const childUser = (await users.registerNewUser(username, password, role));
            await NotificationHelper.info(
                'Welcome to guardian',
                'Next register your account in hedera',
                childUser.id,
            );
            return childUser;
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], parentUser?.id);
            if (error.message.includes('already exists')) {
                throw new HttpException(error.message, HttpStatus.CONFLICT);
            }
            throw new HttpException(error.message, error.code || HttpStatus.INTERNAL_SERVER_ERROR);
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
            return await users.generateNewToken(username, password);
        } catch (error) {
            await this.logger.warn(error.message, ['API_GATEWAY'], null);
            throw new HttpException(error.message, error.code || HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * Change password
     */
    @Post('/change-password')
    @Auth()
    @ApiOperation({
        summary: 'Change user password.',
    })
    @ApiBody({
        description: 'User credentials.',
        type: ChangePasswordDTO
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
    async changePassword(
        @AuthUser() user: IAuthUser,
        @Body() body: ChangePasswordDTO
    ): Promise<AccountsSessionResponseDTO> {
        try {
            const { username, oldPassword, newPassword } = body;
            const users = new Users();
            return await users.changeUserPassword(user, username, oldPassword, newPassword);
        } catch (error) {
            await this.logger.warn(error.message, ['API_GATEWAY'], null);
            throw new HttpException(error.message, error.code || HttpStatus.UNAUTHORIZED);
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
    async getAllAccounts(
        @AuthUser() user: IAuthUser
    ): Promise<AccountsResponseDTO[]> {
        try {
            return await (new Users()).getAllUserAccounts(user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
    @HttpCode(HttpStatus.OK)
    async getStandardRegistries(
        @AuthUser() user: IAuthUser
    ): Promise<any> {
        try {
            return await (new Users()).getAllStandardRegistryAccounts(user.id);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
    @HttpCode(HttpStatus.OK)
    async getAggregatedStandardRegistries(
        @AuthUser() userParent: IAuthUser
    ): Promise<any> {
        const engineService = new PolicyEngine();
        const guardians = new Guardians();
        try {
            const users = new Users();
            const standardRegistries = await users.getAllStandardRegistryAccounts(userParent.id) as StandardRegistryAccountResponse[];
            const promises = standardRegistries
                .filter(({ did, username }) => !!did && !!username)
                .map(async ({ did, username }) => {
                    let vcDocument = {};
                    const user = await users.getUser(username, userParent.id);
                    const vcDocuments = await guardians.getVcDocuments(userParent, {
                        owner: did,
                        type: SchemaEntity.STANDARD_REGISTRY
                    });
                    if (vcDocuments && vcDocuments.length) {
                        vcDocument = vcDocuments[vcDocuments.length - 1];
                    }

                    const { policies } = await engineService.getPolicies(
                        {
                            filters: {
                                status: { $in: [PolicyStatus.PUBLISH, PolicyStatus.DISCONTINUED] }
                            },
                            userDid: did
                        },
                        EntityOwner.sr(null, did)
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
            await InternalException(error, this.logger, userParent.id);
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
            return await (new Guardians()).getBalance(user, user.username);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
