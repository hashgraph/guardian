import { Auth, AuthUser } from '#auth';
import { CACHE, PREFIXES } from '#constants';
import { CacheService, getCacheKey, InternalException, PolicyEngine, UseCache } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions, UserPermissions } from '@guardian/interfaces';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Query, Req, Response, StreamableFile } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiServiceUnavailableResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO,
    NewPolicyCommentDTO,
    NewPolicyDiscussionDTO,
    pageHeader,
    PolicyCommentCountDTO,
    PolicyCommentDTO,
    PolicyCommentRelationshipDTO,
    PolicyCommentSearchDTO,
    PolicyCommentUserDTO,
    PolicyDiscussionDTO,
    SchemaDTO,
    ServiceUnavailableErrorDTO
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
        Permissions.POLICIES_POLICY_MANAGE,
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Returns the list of user names which are present in the target policy and have access to the target document.',
        description: 'Returns the list of user names which are present in the target policy and have access to the target document.'
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
        isArray: true,
        type: PolicyCommentUserDTO,
        example: [{ label: 'Administrator', value: 'Administrator', type: 'role' }]
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyCommentUserDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getUsers(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
    ): Promise<PolicyCommentUserDTO[]> {
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
        Permissions.POLICIES_POLICY_MANAGE,
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Returns the list of documents linked with the target document',
        description: 'Returns the list of documents linked with the target document'
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
        isArray: true,
        type: PolicyCommentRelationshipDTO,
        example: [{ label: 'Description', value: 'string' }]
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyCommentRelationshipDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getRelationships(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
    ): Promise<PolicyCommentRelationshipDTO[]> {
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
        Permissions.POLICIES_POLICY_MANAGE,
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Returns the list of schemas for the target document',
        description: 'Returns the list of schemas for the target document'
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
        isArray: true,
        type: SchemaDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Schema name',
            description: 'Description',
            entity: 'string',
            iri: 'string',
            status: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            version: '1.0.0',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            category: 'string',
            documentURL: 'https://example.com',
            contextURL: 'https://example.com',
            document: {},
            context: {} }]
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemas(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
    ): Promise<SchemaDTO[]> {
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
        Permissions.POLICIES_POLICY_MANAGE,
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Returns the list of discussions for the target document',
        description: 'Returns the list of discussions for the target document'
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
        description: 'Text',
        required: false,
        example: 'Text'
    })
    @ApiQuery({
        name: 'field',
        type: String,
        description: 'Field path',
        required: false,
        example: 'Field path'
    })
    @ApiQuery({
        name: 'readonly',
        type: Boolean,
        description: 'Readonly',
        required: false,
        example: false
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: PolicyDiscussionDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            creator: 'string',
            owner: 'string',
            policyId: 'f3b2a9c1e4d5678901234567',
            target: 'string',
            targetId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            parent: 'string',
            hash: 'QmExampleHash',
            name: 'Common',
            field: '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1',
            fieldName: 'Field name',
            relationships: [Examples.MESSAGE_ID],
            relationshipIds: [Examples.DB_ID],
            privacy: 'public',
            roles: ['string'],
            users: ['string'],
            system: true,
            count: 0,
            document: { id: 'f3b2a9c1e4d5678901234567',
            type: ['string'],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: 'string',
            created: 'string',
            verificationMethod: 'string',
            proofPurpose: 'string',
            jws: 'string' } } }]
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyDiscussionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getDiscussions(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Query('search') search?: string,
        @Query('field') field?: string,
        @Query('readonly') readonly?: boolean
    ): Promise<PolicyDiscussionDTO[]> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const audit = UserPermissions.has(user, Permissions.POLICIES_POLICY_AUDIT) && !!readonly;
            const engineService = new PolicyEngine();
            const params = {
                search,
                field,
                audit
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
        summary: 'Creates a new discussion linked to the target document',
        description: 'Creates a new discussion linked to the target document',
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
        description: 'Config',
        type: NewPolicyDiscussionDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyDiscussionDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            creator: 'string',
            owner: 'string',
            policyId: 'f3b2a9c1e4d5678901234567',
            target: 'string',
            targetId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            parent: 'string',
            hash: 'QmExampleHash',
            name: 'Common',
            field: '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1',
            fieldName: 'Field name',
            relationships: ['message-id'],
            relationshipIds: ['f3b2a9c1e4d5678901234567'],
            privacy: 'public',
            roles: ['string'],
            users: ['string'],
            system: true,
            count: 0,
            document: { id: 'f3b2a9c1e4d5678901234567',
            type: ['string'],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: 'string',
            created: 'string',
            verificationMethod: 'string',
            proofPurpose: 'string',
            jws: 'string' } } }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyDiscussionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async createDiscussion(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Body() body: NewPolicyDiscussionDTO
    ): Promise<PolicyDiscussionDTO> {
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
        summary: 'Creates a new message in the target discussion.',
        description: 'Creates a new message in the target discussion',
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
        description: 'Message',
        type: NewPolicyCommentDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyCommentDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            creator: 'string',
            owner: 'string',
            policyId: 'f3b2a9c1e4d5678901234567',
            topicId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            target: 'string',
            targetId: 'f3b2a9c1e4d5678901234567',
            discussionMessageId: 'f3b2a9c1e4d5678901234567',
            discussionId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            timestamp: 1759493933458,
            hash: 'QmExampleHash',
            sender: 'string',
            senderRole: 'Administrator',
            senderName: 'StandardRegistry',
            recipients: ['did:hedera:testnet:abc123'],
            fields: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'],
            text: 'text',
            document: { id: 'f3b2a9c1e4d5678901234567',
            type: ['string'],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: 'string',
            created: 'string',
            verificationMethod: 'string',
            proofPurpose: 'string',
            jws: 'string' } } }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { code: 503, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyCommentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async createPolicyComment(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Param('discussionId') discussionId: string,
        @Body() body: NewPolicyCommentDTO
    ): Promise<PolicyCommentDTO> {
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
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Returns the list of messages for the target discussion',
        description: 'Returns the list of messages for the target discussion',
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
    @ApiQuery({
        name: 'readonly',
        type: Boolean,
        description: 'Readonly.',
        required: false,
        example: false
    })
    @ApiBody({
        description: 'Search params',
        type: PolicyCommentSearchDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyCommentDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            creator: 'string',
            owner: 'string',
            policyId: 'f3b2a9c1e4d5678901234567',
            topicId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            target: 'string',
            targetId: 'f3b2a9c1e4d5678901234567',
            discussionMessageId: 'f3b2a9c1e4d5678901234567',
            discussionId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            timestamp: 1759493933458,
            hash: 'QmExampleHash',
            sender: 'string',
            senderRole: 'Administrator',
            senderName: 'StandardRegistry',
            recipients: [Examples.DID],
            fields: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'],
            text: 'text',
            document: { id: 'f3b2a9c1e4d5678901234567',
            type: ['string'],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: 'string',
            created: 'string',
            verificationMethod: 'string',
            proofPurpose: 'string',
            jws: 'string' } } }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyCommentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyComments(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Param('discussionId') discussionId: string,
        @Body() body: PolicyCommentSearchDTO,
        @Response() res: any,
        @Query('readonly') readonly?: boolean
    ): Promise<PolicyCommentDTO[]> {
        try {
            const engineService = new PolicyEngine();
            const audit = UserPermissions.has(user, Permissions.POLICIES_POLICY_AUDIT) && !!readonly;
            const { comments, count } = await engineService.getPolicyComments(user, policyId, documentId, discussionId, { ...body, audit });
            return res.header('X-Total-Count', count).send(comments);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get policy comment count
     */
    @Get('/:policyId/:documentId/comments/count')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE
    )
    @ApiOperation({
        summary: 'Returns the count of the messages in the target discussion',
        description: 'Returns the count of the messages in the target discussion',
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
        type: PolicyCommentCountDTO,
        example: { fields: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'], count: 0 }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        example: { code: 503, message: 'Error message' }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyCommentCountDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyCommentsCount(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string
    ): Promise<PolicyCommentCountDTO> {
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
        summary: 'Encrypts and loads the file into IPFS linked to the target discussion',
        description: 'Encrypts and loads the file into IPFS linked to the target discussion',
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
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: String,
        example: 'string'
    })
    @ApiBadRequestResponse({ description: 'Bad request.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
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
        Permissions.POLICIES_POLICY_MANAGE,
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Retrieves and decrypts the file associated with the discussion from IPFS',
        description: 'Retrieves and decrypts the file associated with the discussion from IPFS',
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
        example: { result: 'ok' }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
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

    /**
     * Get key
     */
    @Get('/:policyId/:documentId/keys')
    @Auth(
        Permissions.POLICIES_POLICY_AUDIT,
    )
    @ApiOperation({
        summary: 'Returns the list of private keys for the target document',
        description: 'Returns the list of private keys for the target document',
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
        name: 'discussionId',
        type: String,
        description: 'Discussion Identifier',
        required: false,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        },
        example: { result: 'ok' }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.LONG_TTL })
    @HttpCode(HttpStatus.OK)
    async getKey(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Query('discussionId') discussionId?: string
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const result = await engineService.getDiscussionKey(user, policyId, documentId, discussionId);
            if (result.type !== 'Buffer') {
                throw new HttpException('File is not found', HttpStatus.NOT_FOUND)
            }
            return new StreamableFile(Buffer.from(result));
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
