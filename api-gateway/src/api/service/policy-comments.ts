import { Auth, AuthUser } from '#auth';
import { CACHE, POLICY_REQUIRED_PROPS, PREFIXES } from '#constants';
import { AnyFilesInterceptor, CacheService, EntityOwner, getCacheKey, InternalException, ONLY_SR, PolicyEngine, ProjectService, ServiceError, TaskManager, UploadedFiles, UseCache, parseSavepointIdsJson } from '#helpers';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { DocumentType, Permissions, PolicyHelper, TaskAction, UserRole } from '@guardian/interfaces';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, UseInterceptors, Version, Patch, StreamableFile } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiConsumes, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import {
    BlockDTO,
    DebugBlockConfigDTO,
    DebugBlockHistoryDTO,
    DebugBlockResultDTO,
    Examples,
    ExportMessageDTO,
    ImportMessageDTO,
    InternalServerErrorDTO,
    MigrationConfigDTO,
    pageHeader,
    PoliciesValidationDTO,
    PolicyCategoryDTO,
    PolicyDTO,
    PolicyPreviewDTO,
    PolicyTestDTO,
    PolicyValidationDTO,
    PolicyVersionDTO,
    RunningDetailsDTO,
    ServiceUnavailableErrorDTO,
    TaskDTO
} from '#middlewares';

@Controller('policy-comments')
@ApiTags('policy-comments')
export class PolicyCommentsApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Get users
     */
    @Get('/:policyId/:documentId/users')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
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
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
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
        @Param('documentId') documentId: string,
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.getPolicyUsers(user, policyId, documentId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }


    /**
     * Get relationships
     */
    @Get('/:policyId/:documentId/relationships')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
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
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
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
    async getRelationships(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.getDocumentRelationships(user, policyId, documentId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get schemas
     */
    @Get('/:policyId/:documentId/schemas')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
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
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
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
        @Param('documentId') documentId: string,
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.getDocumentSchemas(user, policyId, documentId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get Discussions
     */
    @Get('/:policyId/:documentId/discussions')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
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
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'search',
        type: String,
        description: '.',
        required: false,
        example: 'test'
    })
    @ApiQuery({
        name: 'field',
        type: String,
        description: '.',
        required: false,
        example: 'test'
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
    async getDiscussions(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Query('search') search?: string,
        @Query('field') field?: string
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            const params = {
                search,
                field
            }
            return await engineService.getPolicyDiscussions(user, policyId, documentId, params);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create discussion
     */
    @Post('/:policyId/:documentId/discussions')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
    )
    @ApiOperation({
        summary: '.',
        description: '',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async createDiscussion(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Body() body: {
            name: string,
            parent: string,
            field: string,
            fieldName: string,
            privacy: string,
            roles: string[],
            users: string[],
            relationships: string[]
        }
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.createPolicyDiscussion(user, policyId, documentId, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create policy comment
     */
    @Post('/:policyId/:documentId/discussions/:discussionId/comments')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
    )
    @ApiOperation({
        summary: 'Create policy comment.',
        description: 'Create policy comment',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'discussionId',
        type: String,
        description: 'Discussion Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Data',
        type: Object
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async createPolicyComment(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Param('discussionId') discussionId: string,
        @Body() body: {
            anchor?: string;
            recipients?: string[];
            fields?: string[];
            text?: string;
            files?: string[];
        }
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.createPolicyComment(user, policyId, documentId, discussionId, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Return a list of comments
     */
    @Post('/:policyId/:documentId/discussions/:discussionId/comments/search')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Return a list of comments.',
        description: 'Returns comments.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'discussionId',
        type: String,
        description: 'Discussion Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(PolicyDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyComments(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Param('discussionId') discussionId: string,
        @Body() body: {
            anchor?: string,
            sender?: string,
            senderRole?: string,
            private?: boolean,
            lt?: string,
            gt?: string
        },
        @Response() res: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const { comments, count } = await engineService.getPolicyComments(user, policyId, documentId, discussionId, body);
            return res.header('X-Total-Count', count).send(comments);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create policy comment count
     */
    @Get('/:policyId/:documentId/comments/count')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
    )
    @ApiOperation({
        summary: '.',
        description: '',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BlockDTO
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(BlockDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyCommentsCount(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.getPolicyCommentsCount(user, policyId, documentId);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Add file from ipfs
     */
    @Post('/:policyId/:documentId/discussions/:discussionId/comments/file')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
    )
    @ApiOperation({
        summary: 'Add file from ipfs.',
        description: 'Add file from ipfs.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'discussionId',
        type: String,
        description: 'Discussion Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Binary data.',
        required: true,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postFile(
        @Body() body: any,
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Param('discussionId') discussionId: string,
        @Req() req
    ): Promise<string> {
        try {
            if (!Object.values(body).length) {
                throw new HttpException('Body content in request is empty', HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const engineService = new PolicyEngine();
            const { cid } = await engineService.addFileIpfs(user, policyId, documentId, discussionId, body);
            if (!cid) {
                throw new HttpException('File is not uploaded', HttpStatus.BAD_REQUEST);
            }

            const invalidedCacheTags = [`${PREFIXES.POLICY_COMMENTS}file/${cid}`];
            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheTags], req.user));

            return JSON.stringify(cid);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get file
     */
    @Get('/:policyId/:documentId/discussions/:discussionId/comments/file/:cid')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
    )
    @ApiOperation({
        summary: 'Get file from ipfs.',
        description: 'Get file from ipfs.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'discussionId',
        type: String,
        description: 'Discussion Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'cid',
        type: String,
        description: 'File cid',
        required: true,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getFile(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Param('discussionId') discussionId: string,
        @Param('cid') cid: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.getFileIpfs(user, policyId, documentId, discussionId, cid, 'raw');
            if (result.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            return new StreamableFile(Buffer.from(result));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
