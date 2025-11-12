import { Auth, AuthUser } from '#auth';
import { InternalException, Guardians, Users } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Response } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO,
    NewRelayerAccountDTO,
    pageHeader,
    RelayerAccountDTO,
    VcDocumentDTO,
} from '#middlewares';

@Controller('relayer-accounts')
@ApiTags('relayer-accounts')
export class RelayerAccountsApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Get Relayer Accounts
     */
    @Get('/')
    @Auth()
    @ApiOperation({
        summary: 'Returns the list of Relayer Accounts of the active user.',
        description: 'Returns the list of Relayer Accounts of the active user.'
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
        isArray: true,
        headers: pageHeader,
        type: RelayerAccountDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RelayerAccountDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccounts(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
    ): Promise<RelayerAccountDTO[]> {
        try {
            const users = new Users();
            const filters = {
                search,
                pageIndex,
                pageSize
            }
            const { items, count } = await users.getRelayerAccounts(user, filters);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create Relayer Account
     */
    @Post('/')
    @Auth()
    @ApiOperation({
        summary: 'Adds a new Relayer Account for the active user.',
        description: 'Adds a new Relayer Account for the active user.',
    })
    @ApiBody({
        description: 'New Relayer Account',
        type: NewRelayerAccountDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RelayerAccountDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RelayerAccountDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async createRelayerAccount(
        @AuthUser() user: IAuthUser,
        @Body() body: RelayerAccountDTO
    ): Promise<RelayerAccountDTO> {
        try {
            const users = new Users();
            return await users.createRelayerAccount(user, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get current Relayer Account
     */
    @Get('/current')
    @Auth(
    )
    @ApiOperation({
        summary: 'Returns current Relayer Account of the active user.',
        description: 'Returns current Relayer Account of the active user.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: RelayerAccountDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RelayerAccountDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getCurrentRelayerAccount(
        @AuthUser() user: IAuthUser,
    ): Promise<RelayerAccountDTO> {
        try {
            const users = new Users();
            return await users.getCurrentRelayerAccount(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get all Relayer Accounts
     */
    @Get('/all')
    @Auth(
    )
    @ApiOperation({
        summary: 'Returns the list of Relayer Accounts available for use in the Policy by the active user.',
        description: 'Returns the list of Relayer Accounts available for use in the Policy by the active user.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: RelayerAccountDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RelayerAccountDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountsAll(
        @AuthUser() user: IAuthUser,
    ): Promise<RelayerAccountDTO[]> {
        try {
            const users = new Users();
            return await users.getRelayerAccountsAll(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get Relayer Account balance
     */
    @Get('/:account/balance')
    @Auth(
    )
    @ApiOperation({
        summary: 'Returns current hbar balance of the specified Relayer Account.',
        description: 'Returns current hbar balance of the specified Relayer Account.'
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
     * Generate Relayer Account
     */
    @Post('/generate')
    @Auth()
    @ApiOperation({
        summary: 'Generate a new Relayer Account.',
        description: 'Generate a new Relayer Account.',
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
     * Get Relayer Accounts
     */
    @Get('/accounts')
    @Auth(
    )
    @ApiOperation({
        summary: 'Return the list of Relayer Accounts for the user. If the active user is a Standard Registry return the list of all Relayer Accounts of its users.',
        description: 'Return the list of Relayer Accounts for the user. If the active user is a Standard Registry return the list of all Relayer Accounts of its users.'
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
        isArray: true,
        headers: pageHeader,
        type: RelayerAccountDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(RelayerAccountDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getUserRelayerAccounts(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
    ): Promise<RelayerAccountDTO[]> {
        try {
            const users = new Users();
            const filters = {
                search,
                pageIndex,
                pageSize
            }
            const { items, count } = await users.getUserRelayerAccounts(user, filters);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get relationships
     */
    @Get('/:relayerAccountId/relationships')
    @Auth(
    )
    @ApiOperation({
        summary: 'Return the list of VC documents which are associated with the selected Relayer Account.',
        description: 'Return the list of VC documents which are associated with the selected Relayer Account.'
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
        isArray: true,
        headers: pageHeader,
        type: VcDocumentDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(VcDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountRelationships(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('relayerAccountId') relayerAccountId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<VcDocumentDTO[]> {
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
