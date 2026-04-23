import { IAuthUser, NotificationHelper, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Permissions, PolicyStatus, SchemaEntity, TaskAction, UserRole } from '@guardian/interfaces';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, getSchemaPath } from '@nestjs/swagger';
import {
    AccessTokenRequestDTO,
    AccessTokenResponseDTO,
    AccountsLoginResponseDTO,
    AccountsResponseDTO,
    AccountsSessionResponseDTO,
    AggregatedDTOItem,
    BalanceResponseDTO,
    ChangePasswordDTO,
    ConflictErrorDTO,
    Examples,
    InternalServerErrorDTO,
    LoginUserDTO,
    OnboardingDTO, RegisterUserDTO, TaskDTO,
    StandardRegistryAccountDTO,
    UnauthorizedErrorDTO,
    UnprocessableEntityErrorDTO,
    UserAccountDTO,
    GenerateOPTResponseDTO,
    EmptyResponseDTO,
    LoginSuccessResponseDTO,
    LoginOTPRequiredResponseDTO,
    OTPConfirmDTO,
    OTPConfirmResponseDTO,
    ObjectExamples,
    OTPStatusResponseDTO
} from '#middlewares';
import { Auth, AuthUser, checkPermission } from '#auth';
import { EntityOwner, Guardians, InternalException, PolicyEngine, ServiceError, TaskManager, UseCache, Users } from '#helpers';
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
        examples: {
            authorizedWithHederaId: {
                summary: 'Authorized user with Hedera ID',
                value: ObjectExamples.SESSION_RESPONSE_WITH_ID
            },
            authorizedWithoutHederaId: {
                summary: 'Authorized user without Hedera ID',
                value: ObjectExamples.SESSION_RESPONSE_WITHOUT_ID
            },
            Unauthorized: {
                summary: 'Unauthorized request',
                value: null
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        description: 'Object that contain username, password and role fields.',
    })
    @ApiBody({
        description: 'Register payload.',
        required: true,
        type: RegisterUserDTO,
        examples: {
            registerBody: {
                value: {
                    username: Examples.USER_NAME_SR_1,
                    password: 'StrongPassword3#',
                    password_confirmation: 'StrongPassword3#',
                    role: Examples.ROLE_SR
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: AccountsResponseDTO,
        example: ObjectExamples.REGISTER_RESPONSE
    })
    @ApiConflictResponse({
        description: 'Conflict.',
        type: ConflictErrorDTO,
        example: { statusCode: 409, message: 'An account with the same name already exists.' }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: ['password should not be empty',
                'password must be a string',
                'Passwords must match'
            ],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
                throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
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
     * Registers and fully onboards a new user in a single async call.
     *
     * @param body.username           - Username for the new account
     * @param body.password           - Password
     * @param body.password_confirmation - Must match password
     * @param body.role               - UserRole.USER or UserRole.STANDARD_REGISTRY
     * @param body.hederaAccountId    - Optional. Auto-generated from operator if omitted
     * @param body.hederaAccountKey   - Required when hederaAccountId is provided
     * @param body.parent             - Optional. Standard Registry username/DID (USER role only)
     * @param body.vcDocument         - Optional. VC subject to publish during setup
     * @param body.didDocument        - Optional. Custom DID document; auto-generated if omitted
     * @param body.didKeys            - Optional. Keys for the custom DID document
     * @param body.useFireblocksSigning - Optional. Use Fireblocks instead of local key
     * @param body.fireblocksConfig   - Optional. Fireblocks configuration
     *
     * @returns TaskDTO — poll GET /tasks/:taskId for result
     */
    @Post('/push/onboard')
    @ApiOperation({
        summary: 'Registers and fully onboards a new user account.',
        description:
            'Creates a user account, ' +
            'Hedera account, DID, and cryptographic keys on behalf of the user. ' +
            'If hederaAccountId / hederaAccountKey are omitted the platform generates them. ',
    })
    @ApiBody({
        description: 'Registration and optional Hedera / DID credentials.',
        type: OnboardingDTO,
    })
    @ApiOkResponse({
        description: 'Task created — poll for completion.',
        type: TaskDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(OnboardingDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async registerAndOnboard(
        @Body() body: OnboardingDTO,
        @Req() req: any,
    ): Promise<TaskDTO> {
        const users = new Users();
        let parentUser: IAuthUser | null = null;

        const HEDERA_ACCOUNT_ID_REGEX = /^\d+\.\d+\.\d+$/;
        const HEDERA_ACCOUNT_KEY_REGEX =
            /^(?:302e020100300506032b657004220420[0-9a-fA-F]{64}|[0-9a-fA-F]{64})$/;

        if (!ApplicationEnvironment.demoMode) {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(' ')[1];
            try {
                parentUser = await users.getUserByToken(token) as IAuthUser;
            } catch (_) {
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

        if (body.hederaAccountKey && !HEDERA_ACCOUNT_ID_REGEX.test(body.hederaAccountId)) {
            throw new HttpException(
                'Invalid hederaAccountId format. Expected format: 0.0.XXXXX',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        if (body.hederaAccountId && !HEDERA_ACCOUNT_KEY_REGEX.test(body.hederaAccountKey)) {
            throw new HttpException(
                'Invalid hederaAccountKey format. Expected a valid Hedera private key',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        // USER role must have a Standard Registry parent
        if (body.role === UserRole.USER) {
            if (!body.parent?.trim()) {
                throw new HttpException(
                    'parent (Standard Registry username) is required for USER role accounts',
                    HttpStatus.BAD_REQUEST,
                );
            }
            const parentSR = await users.getUser(body.parent.trim(), parentUser?.id ?? null);
            if (!parentSR) {
                throw new HttpException(
                    `Standard Registry '${body.parent}' not found`,
                    HttpStatus.BAD_REQUEST,
                );
            }
            if (parentSR.role !== UserRole.STANDARD_REGISTRY) {
                throw new HttpException(
                    `'${body.parent}' is not a Standard Registry`,
                    HttpStatus.BAD_REQUEST,
                );
            }
            body.parent = parentSR.did;
        }

        const existingUser = await users.getUser(body.username, parentUser?.id ?? null);
        if (existingUser) {
            throw new HttpException(
                `Username '${body.username}' is already taken`,
                HttpStatus.CONFLICT,
            );
        }

        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.ONBOARD_USER, parentUser?.id ?? null);

        // After the task completes, transfer ownership to the newly created user
        taskManager.registerCallback(task, async (completedTask) => {
            if (completedTask.result?.username) {
                try {
                    const users = new Users();
                    const newUser = await users.getUser(completedTask.result.username, parentUser?.id ?? null);
                    if (newUser?.id) {
                        taskManager.transferOwnership(task.taskId, newUser.id);
                    }
                } catch (_) {
                    // Non-fatal — ownership transfer best-effort
                }
            }
        });

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.onboardUserAsync(parentUser, body, task);
        }, async (error) => {
            await this.logger.error(error, ['API_GATEWAY'], parentUser?.id);
            taskManager.addError(task.taskId, { code: error.code || 500, message: error.message });
        });

        return task;
    }

    /**
     * Login
     */
    @Post('/login')
    @ApiOperation({
        summary: 'Logs user into the system.',
    })
    @ApiBody({
        description: 'Login payload.',
        required: true,
        type: LoginUserDTO,
        examples: {
            loginBody: {
                value: {
                    username: Examples.USER_NAME_SR_1,
                    password: 'test'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccountsLoginResponseDTO,
        schema: {
            oneOf: [
                { $ref: getSchemaPath(LoginSuccessResponseDTO) },
                { $ref: getSchemaPath(LoginOTPRequiredResponseDTO) }
            ]
        },
        examples: {
            success: {
                summary: 'Successful response',
                value: ObjectExamples.LOGIN_SUCCESSFUL
            },
            otpRequired: {
                summary: 'OTP required',
                value: ObjectExamples.OTP_REQUIRED_RESPONSE
            }
	}
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized request.',
        type: UnauthorizedErrorDTO,
        example: {
            statusCode: 401,
            message: 'Unauthorized request'
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: [
                'password should not be empty',
                'password must be a string'
            ],
            error: 'Unprocessable Entity',
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() body: LoginUserDTO
    ): Promise<AccountsSessionResponseDTO> {
        try {
            const { username, password, otp } = body;
            const users = new Users();
            return await users.generateNewToken(username, password, otp);
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
        type: ChangePasswordDTO,
        examples: {
            changePasswordBody: {
                value: {
                    username: Examples.USER_NAME_SR_1,
                    oldPassword: 'test',
                    newPassword: 'AnotherStrongPassword3#'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccountsLoginResponseDTO,
        example: {
            username: Examples.USER_NAME_SR_1,
            did: Examples.DID,
            role: Examples.ROLE_SR,
            refreshToken: Examples.REFRESH_TOKEN
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        example: {
            message: [
                'Password must be at least 4 characters long.'
            ],
            statusCode: 422
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
    @ApiBody({
        description: 'Object that contains a refresh token.',
        type: AccessTokenRequestDTO,
        examples: {
            accessTokenBody: {
                value: {
                    refreshToken: Examples.REFRESH_TOKEN
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: AccessTokenResponseDTO,
        example: { accessToken: Examples.ACCESS_TOKEN }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
    @HttpCode(HttpStatus.OK)
    async getAccessToken(
        @Body() body: AccessTokenRequestDTO
    ): Promise<AccessTokenResponseDTO> {
        try {
            const { refreshToken } = body;
            const users = new Users();
            const { accessToken } = await users.generateNewAccessToken(refreshToken);
            if (!accessToken) {
                throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
            }
            return {
                accessToken
            }
        } catch (e) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
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
        summary: 'Returns a list of users, excluding Standard Registry.',
        description: 'Returns all users except those with role Standard ' +
            'Registry. Only users with the Standard ' +
            'Registry role are allowed to make the request.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: UserAccountDTO,
        example:
            [
                {
                    username: 'Installer',
                    parent: Examples.DID,
                    did: Examples.DID_2
                },
                {
                    username: 'Installer2'
                }
            ]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        isArray: true,
        type: StandardRegistryAccountDTO,
        example:
            [
                {
                    username: Examples.USER_NAME_SR_1,
                    did: Examples.DID
                },
                {
                    username: Examples.USER_NAME_SR_2
                }
            ]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        type: AggregatedDTOItem,
        example: [
            {
                did: Examples.DID,
                vcDocument: ObjectExamples.VC_DOCUMENT_1,
                policies: [
                    ObjectExamples.POLICY_1,
                    ObjectExamples.POLICY_2
                ],
                username: Examples.USER_NAME_SR_1,
                hederaAccountId: Examples.ACCOUNT_ID
            },
            {
                did: 'did:hedera:testnet:AacaQZTo8bEEecUXTZMar5BvZjAkvsEAFcD6NmzgXt5K_0.0.8148963',
                vcDocument: ObjectExamples.VC_DOCUMENT_2,
                policies: [],
                username: Examples.USER_NAME_SR_2,
                hederaAccountId: '0.0.8148961'
            }
        ]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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
        type: BalanceResponseDTO,
        examples: {
            authorizedWithHederaId: {
                summary: 'Authorized user with Hedera ID',
                value: {
                    balance: '833.88244301 ℏ',
                    unit: 'Hbar',
                    user: {
                        username: Examples.USER_NAME_SR_1,
                        did: Examples.DID
                    }
                }
            },
            authorizedWithoutHederaId: {
                summary: 'Authorized user without Hedera ID',
                value: null
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' }
    })
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

    /**
     * Generate an OTP secret for 2FA setup
     */
    @Post('otp/generate')
    @Auth()
    @ApiOperation({
        summary: 'Generate an OTP secret for 2FA setup.',
        description: 'Generate an OTP secret for 2FA setup.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: GenerateOPTResponseDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.CREATED)
    async generateOtp(@AuthUser() user: IAuthUser,) {
        const users = new Users();
        try {
            const code = await users.otpGenerateSecret(user.id);

            return code

        } catch (error) {
            await this.logger.error(error.message, ['API_GATEWAY']);
            throw new HttpException(error.message, error.code || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Confirm OTP setup
     */
    @Post('otp/confirm')
    @Auth()
    @ApiOperation({
        summary: 'Confirm OTP setup.',
        description: 'Confirm OTP setup by OTP token.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: OTPConfirmDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: OTPConfirmResponseDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.CREATED)
    async confirmOtp(
        @AuthUser() user: IAuthUser,
        @Body() body: OTPConfirmDTO
    ) {
        const users = new Users();
        try {
            const token = body.token;
            const result = await users.otpConfirmSecret(user.id, token);

            return result;

        } catch (error) {
            await this.logger.error(error.message, ['API_GATEWAY']);
            throw new HttpException(error.message, error.code || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get OTP status
     */
    @Get('otp/status')
    @Auth()
    @ApiOperation({
        summary: 'Get OTP status.',
        description: 'Get OTP status for the current user.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: OTPStatusResponseDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getOtpStatus(
        @AuthUser() user: IAuthUser,
    ) {
        const users = new Users();
        try {
            const result = await users.otpGetStatus(user.id);

            return result;

        } catch (error) {
            await this.logger.error(error.message, ['API_GATEWAY']);
            throw new HttpException(error.message, error.code || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Deactivate 2FA
     */
    @Post('otp/deactivate')
    @Auth()
    @ApiOperation({
        summary: 'Deactivate 2FA.',
        description: 'Deactivate 2FA.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: EmptyResponseDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.CREATED)
    async deactivateOtp(
        @AuthUser() user: IAuthUser,
    ) {
        const users = new Users();
        try {
            const result = await users.otpDeactivate(user.id);

            return result;

        } catch (error) {
            await this.logger.error(error.message, ['API_GATEWAY']);
            throw new HttpException(error.message, error.code || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
