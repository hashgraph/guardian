import { Auth, AuthUser } from '#auth';
import { InternalException, PolicyEngine } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Param, Query, Response } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO
} from '#middlewares';

@Controller('policy-repository')
@ApiTags('policy-repository')
export class PolicyRepositoryApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Get users
     */
    @Get('/:policyId/users')
    @Auth(
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
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
    async getUsers(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.getPolicyRepositoryUsers(user, policyId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get schemas
     */
    @Get('/:policyId/schemas')
    @Auth(
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
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
    async getSchemas(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.getPolicyRepositorySchemas(user, policyId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get documents
     */
    @Get('/:policyId/documents')
    @Auth(
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: '',
        description: ''
    })
    @ApiParam({
        name: 'policyId',
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
    @ApiQuery({
        name: 'type',
        type: String,
        description: '',
        required: false,
        example: 'VC'
    })
    @ApiQuery({
        name: 'owner',
        type: String,
        description: '',
        required: false
    })
    @ApiQuery({
        name: 'schema',
        type: String,
        description: '',
        required: false
    })
    @ApiQuery({
        name: 'comments',
        type: Boolean,
        description: '',
        required: false
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
    async getDocuments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('policyId') policyId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('type') type?: string,
        @Query('owner') owner?: string,
        @Query('schema') schema?: string,
        @Query('comments') comments?: boolean,
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const filters = {
                type,
                owner,
                schema,
                comments,
                pageIndex,
                pageSize
            }
            const engineService = new PolicyEngine();
            const { documents, count } = await engineService.getPolicyRepositoryDocuments(user, policyId, filters);
            return res.header('X-Total-Count', count).send(documents);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
