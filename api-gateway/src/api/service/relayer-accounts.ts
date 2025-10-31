import { Auth, AuthUser } from '#auth';
import { InternalException, Guardians, Users } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Response } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO,
} from '#middlewares';

@Controller('relayer-accounts')
@ApiTags('relayer-accounts')
export class RelayerAccountsApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     *
     */
    @Get('/')
    @Auth(
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'search',
        type: String,
        description: '',
        required: false,
        example: 'search'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccounts(
        @AuthUser() user: IAuthUser,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
    ): Promise<any> {
        try {
            const users = new Users();
            const filters = {
                search,
                pageIndex,
                pageSize
            }
            return await users.getRelayerAccounts(user, filters);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *
     */
    @Post('/')
    @Auth()
    @ApiOperation({
        summary: '',
        description: '',
    })
    @ApiBody({
        description: '',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async createRelayerAccount(
        @AuthUser() user: IAuthUser,
        @Body() body: {
            name?: string,
            account?: string,
            key?: string,
        }
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.createRelayerAccount(user, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *
     */
    @Get('/current')
    @Auth(
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getCurrentRelayerAccount(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.getCurrentRelayerAccount(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *
     */
    @Get('/all')
    @Auth(
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountsAll(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.getRelayerAccountsAll(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *
     */
    @Get('/:account/balance')
    @Auth(
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiParam({
        name: 'account',
        type: String,
        description: 'Account',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountBalance(
        @AuthUser() user: IAuthUser,
        @Param('account') account: string,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.getRelayerAccountBalance(user, account);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *
     */
    @Post('/generate')
    @Auth()
    @ApiOperation({
        summary: '',
        description: '',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async generateRelayerAccount(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.generateRelayerAccount(user);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *
     */
    @Get('/accounts')
    @Auth(
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'search',
        type: String,
        description: '',
        required: false,
        example: 'search'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getUserRelayerAccounts(
        @AuthUser() user: IAuthUser,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
    ): Promise<any> {
        try {
            const users = new Users();
            const filters = {
                search,
                pageIndex,
                pageSize
            }
            return await users.getUserRelayerAccounts(user, filters);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     *
     */
    @Get('/:relayerAccountId/relationships')
    @Auth(
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiParam({
        name: 'relayerAccountId',
        type: String,
        description: 'Relayer Account Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Object
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountRelationships(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('relayerAccountId') relayerAccountId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<any> {
        try {
            const filters = {
                pageIndex,
                pageSize
            }
            const guardian = new Guardians();
            const { items, count } = await guardian.getRelayerAccountRelationships(relayerAccountId, user, filters);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
