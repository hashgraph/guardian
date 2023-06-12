import { Users } from '@helpers/users';
import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { UserRole } from '@guardian/interfaces';
import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, checkPermission } from '@auth/authorization-helper';
import { AccountsResponseDTO, AccountsSessionResponseDTO, LoginUserDTO, RegisterUserDTO } from '@middlewares/validation/schemas/accounts';
import { ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { User } from '@helpers/decorators/user';

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
    async getSession(@User() user): Promise<AccountsSessionResponseDTO> {
        const users = new Users();
        return user as any;
        // try {
        //     const authHeader = headers.authorization;
        //     const token = authHeader.split(' ')[1];
        //     return await users.getUserByToken(token) as any;
        // } catch (error) {
        //     new Logger().error(error, ['API_GATEWAY']);
        //     throw error;
        // }

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
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
