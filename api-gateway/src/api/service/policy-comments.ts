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
    ServiceUnavailableErrorDTO,
    UnprocessableEntityErrorDTO
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
        description: 'Successful operation. Returns mix of broadcast target ("all"), role targets, and individual user targets with their roles.',
        isArray: true,
        type: PolicyCommentUserDTO,
        examples: {
            withUsers: {
                summary: 'Users and roles found',
                value: [
                    { label: 'All', value: 'all', type: 'all' },
                    { label: 'Administrator', value: 'Administrator', type: 'role' },
                    { label: 'Project_Proponent', value: 'Project_Proponent', type: 'role' },
                    { label: 'ExampleUser', value: Examples.DID, roles: ['Document Owner', 'Administrator'], type: 'user' }
                ]
            },
            empty: {
                summary: 'No users',
                value: []
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        examples: {
            default: {
                    summary: 'Default example',
                value: [{ label: 'Parent VC Document', value: Examples.MESSAGE_ID }]
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        examples: {
            default: {
                    summary: 'Default example',
                value: [{ id: Examples.DB_ID,
                    uuid: Examples.UUID,
                    name: 'Schema name',
                    description: 'Description',
                    entity: 'POLICY',
                    iri: Examples.UUID,
                    status: 'DRAFT',
                    topicId: Examples.ACCOUNT_ID,
                    version: '1.0.0',
                    owner: Examples.DID,
                    messageId: Examples.MESSAGE_ID,
                    category: 'POLICY',
                    documentURL: Examples.IPFS,
                    contextURL: Examples.IPFS,
                    document: {},
                    context: {} }]
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        description: 'When true and user has POLICIES_POLICY_AUDIT permission, enables audit mode — bypasses privacy filters and shows all discussions.',
        required: false,
        example: false
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns discussions linked to the document, filtered by privacy settings unless in audit mode.',
        isArray: true,
        type: PolicyDiscussionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: [{ id: Examples.DB_ID,
                    uuid: Examples.UUID,
                    creator: Examples.DID,
                    owner: Examples.DID,
                    policyId: Examples.DB_ID,
                    target: 'string',
                    targetId: Examples.DB_ID,
                    messageId: Examples.MESSAGE_ID,
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
                    document: { id: Examples.DB_ID,
                    type: ['string'],
                    credentialSubject: {},
                    issuer: {},
                    issuanceDate: Examples.DATE,
                    proof: { type: 'string',
                    created: Examples.DATE,
                    verificationMethod: 'string',
                    proofPurpose: 'string',
                    jws: 'string' } } }]
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        type: NewPolicyDiscussionDTO,
        examples: {
            publicDiscussion: {
                summary: 'Create a public discussion',
                value: {
                    name: 'Common',
                    field: '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1',
                    fieldName: 'Field name',
                    privacy: 'public'
                }
            },
            roleBasedDiscussion: {
                summary: 'Create a role-based discussion',
                value: {
                    name: 'Review Discussion',
                    privacy: 'roles',
                    roles: ['Installer']
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyDiscussionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
                    uuid: Examples.UUID,
                    creator: Examples.DID,
                    owner: Examples.DID,
                    policyId: Examples.DB_ID,
                    target: 'string',
                    targetId: Examples.DB_ID,
                    messageId: Examples.MESSAGE_ID,
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
                    document: { id: Examples.DB_ID,
                    type: ['string'],
                    credentialSubject: {},
                    issuer: {},
                    issuanceDate: Examples.DATE,
                    proof: { type: 'string',
                    created: Examples.DATE,
                    verificationMethod: 'string',
                    proofPurpose: 'string',
                    jws: 'string' } } }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        type: NewPolicyCommentDTO,
        examples: {
            textComment: {
                summary: 'Create a text comment',
                value: {
                    text: 'This field needs review.',
                    fields: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1']
                }
            },
            commentWithRecipients: {
                summary: 'Create a comment with recipients',
                value: {
                    text: 'Please review this document.',
                    recipients: ['did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599'],
                    fields: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1']
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyCommentDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
                    uuid: Examples.UUID,
                    creator: Examples.DID,
                    owner: Examples.DID,
                    policyId: Examples.DB_ID,
                    topicId: Examples.ACCOUNT_ID,
                    policyTopicId: Examples.ACCOUNT_ID,
                    policyInstanceTopicId: Examples.ACCOUNT_ID,
                    target: 'string',
                    targetId: Examples.DB_ID,
                    discussionMessageId: Examples.MESSAGE_ID,
                    discussionId: Examples.DB_ID,
                    messageId: Examples.MESSAGE_ID,
                    timestamp: 1759493933458,
                    hash: 'QmExampleHash',
                    sender: Examples.DID,
                    senderRole: 'Administrator',
                    senderName: 'StandardRegistry',
                    recipients: [Examples.DID],
                    fields: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'],
                    text: 'text',
                    document: { id: Examples.DB_ID,
                    type: ['string'],
                    credentialSubject: {},
                    issuer: {},
                    issuanceDate: Examples.DATE,
                    proof: { type: 'string',
                    created: Examples.DATE,
                    verificationMethod: 'string',
                    proofPurpose: 'string',
                    jws: 'string' } } }
            }
        }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { statusCode: 503, message: 'Error message' }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        description: 'When true and user has POLICIES_POLICY_AUDIT permission, enables audit mode — bypasses privacy filters.',
        required: false,
        example: false
    })
    @ApiBody({
        description: 'Search params',
        type: PolicyCommentSearchDTO,
        examples: {
            searchComments: {
                summary: 'Search comments by text',
                value: {
                    search: 'review',
                    field: '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'
                }
            },
            paginatedSearch: {
                summary: 'Paginated search',
                value: {
                    search: 'text',
                    lt: '69aeb71ef8c5b278e3bab4e5'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyCommentDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: [{ id: Examples.DB_ID,
                    uuid: Examples.UUID,
                    creator: Examples.DID,
                    owner: Examples.DID,
                    policyId: Examples.DB_ID,
                    topicId: Examples.ACCOUNT_ID,
                    policyTopicId: Examples.ACCOUNT_ID,
                    policyInstanceTopicId: Examples.ACCOUNT_ID,
                    target: 'string',
                    targetId: Examples.DB_ID,
                    discussionMessageId: Examples.MESSAGE_ID,
                    discussionId: Examples.DB_ID,
                    messageId: Examples.MESSAGE_ID,
                    timestamp: 1759493933458,
                    hash: 'QmExampleHash',
                    sender: Examples.DID,
                    senderRole: 'Administrator',
                    senderName: 'StandardRegistry',
                    recipients: [Examples.DID],
                    fields: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'],
                    text: 'text',
                    document: { id: Examples.DB_ID,
                    type: ['string'],
                    credentialSubject: {},
                    issuer: {},
                    issuanceDate: Examples.DATE,
                    proof: { type: 'string',
                    created: Examples.DATE,
                    verificationMethod: 'string',
                    proofPurpose: 'string',
                    jws: 'string' } } }]
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        examples: {
            default: {
                    summary: 'Default example',
                value: { fields: { '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1': 3, '#85c18385-e371-44ad-8155-57a834ba185a/projectTitle': 1 }, count: 4 }
            }
        }
    })
    @ApiServiceUnavailableResponse({
        description: 'Block Unavailable.',
        type: ServiceUnavailableErrorDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { statusCode: 503, message: 'Error message' }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
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
        description: 'Binary file data to encrypt and upload to IPFS. The file is linked to the target discussion.',
        required: true,
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: String,
        examples: {
            default: {
                    summary: 'Default example',
                value: 'bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
            }
        }
    })
    @ApiBadRequestResponse({ description: 'Bad request.', type: InternalServerErrorDTO, examples: { default: { summary: 'Default example', value: { statusCode: 400, message: 'File is not uploaded' } } }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { default: { summary: 'Default example', value: { statusCode: 422, message: 'Body content in request is empty' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
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
        description: 'IPFS Content Identifier of the uploaded file',
        required: true,
        example: 'bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns the decrypted file as binary stream.',
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiNotFoundResponse({ description: 'File not found.', type: InternalServerErrorDTO, examples: { default: { summary: 'Default example', value: { statusCode: 404, message: 'File is not found' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
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
        summary: 'Returns the encryption key for the target document discussions.',
        description: 'Returns the encryption key as a binary file for decrypting discussion content linked to the target document. Optionally filter by specific discussion ID.',
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
    })
    @ApiNotFoundResponse({ description: 'Key file not found.', type: InternalServerErrorDTO, examples: { default: { summary: 'Default example', value: { statusCode: 404, message: 'File is not found' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            documentNotFound: {
                summary: 'Document not found or does not belong to this policy',
                value: { statusCode: 500, message: 'Document not found.' }
            },
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
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
