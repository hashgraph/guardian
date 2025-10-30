import { Auth, AuthUser } from '#auth';
import { InternalException, Guardians, Users } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Query, Response } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO,
    pageHeader,
    PolicyCommentUserDTO,
    SchemaDTO,
    VcDocumentDTO
} from '#middlewares';

@Controller('project-wallet')
@ApiTags('project-wallet')
export class ProjectWalletApi {
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
    async getProjectWallets(
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
            return await users.getProjectWallets(user, filters);
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
    async createProjectWallet(
        @AuthUser() user: IAuthUser,
        @Body() body: {
            name?: string,
            account?: string,
            key?: string,
        }
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.createProjectWallet(user, body);
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
    async getCurrentWallet(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.getCurrentWallet(user);
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
    async getProjectWalletsAll(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.getProjectWalletsAll(user);
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
    async getProjectWalletBalance(
        @AuthUser() user: IAuthUser,
        @Param('account') account: string,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.getProjectWalletBalance(user, account);
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
    async generateProjectWallet(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.generateProjectWallet(user);
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
    async getUserWallets(
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
            return await users.getUserWallets(user, filters);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * 
     */
    @Get('/:wallet/relationships')
    @Auth(
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiParam({
        name: 'wallet',
        type: String,
        description: 'Policy Id',
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
    async getRelationships(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('wallet') wallet: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<any> {
        try {
            const filters = {
                pageIndex,
                pageSize
            }
            const guardian = new Guardians();
            const { items, count } = await guardian.getWalletRelationships(wallet, user, filters);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
