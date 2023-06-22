import { Users } from '@helpers/users';
import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { SchemaEntity, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from '@helpers/policy-engine';
import { PolicyListResponse } from '@entities/policy';
import { StandardRegistryAccountResponse } from '@entities/account';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@auth/authorization-helper';
import { AccountsResponseDTO, AccountsSessionResponseDTO, AggregatedDTOItem, BalanceResponseDTO, LoginUserDTO, RegisterUserDTO } from '@middlewares/validation/schemas/accounts';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';

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
     * @param user
     */
    @ApiOperation({
        summary: 'Returns current session of the user.',
        description: 'Returns current user session.',
    })
    @ApiExtraModels(AccountsSessionResponseDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(AccountsSessionResponseDTO),
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Get('/session')
    async getSession(@Headers() headers): Promise<AccountsSessionResponseDTO> {
        const users = new Users();
        try {
            const authHeader = headers.authorization;
            const token = authHeader.split(' ')[1];
            return await users.getUserByToken(token) as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
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
    async register(@Body() body: RegisterUserDTO): Promise<AccountsResponseDTO> {
        const users = new Users();
        try {
            const {username, password} = body;
            let {role} = body;
            // @deprecated 2022-10-01
            if (role === 'ROOT_AUTHORITY') {
                role = UserRole.STANDARD_REGISTRY;
            }
            return await users.registerNewUser(username, password, role) as any;
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
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
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
    @Get()
    @HttpCode(HttpStatus.OK)
    async getAllAccounts(@Req() req): Promise<AccountsResponseDTO[]> {
        // await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const users = new Users();
            return await users.getAllUserAccounts() as any;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get root authorities
     * @deprecated 2022-10-01
     */
    @ApiOperation({
        summary: 'Returns all Standard Registries.',
        description: 'Returns all Standard Registries.',
        deprecated: true
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
    @Get('/root-authorities')
    @HttpCode(HttpStatus.OK)
    async getRootAuthorities(): Promise<AccountsResponseDTO> {
        try {
            const users = new Users();
            return await users.getAllStandardRegistryAccounts() as any;
        } catch (error) {
            new Logger().error(error.message, ['API_GATEWAY']);
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
