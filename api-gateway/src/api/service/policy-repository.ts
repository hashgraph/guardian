import { Auth, AuthUser } from '#auth';
import { InternalException, PolicyEngine } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Param, Query, Response } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO,
    ObjectExamples,
    pageHeader,
    PolicyCommentUserDTO,
    SchemaDTO,
    UnprocessableEntityErrorDTO,
    VcDocumentDTO
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
        summary: 'Returns the list of users present in the policy.',
        description: 'Returns all users (grouped by DID) who have joined the specified policy, including their roles. The policy owner is always listed as "Administrator". Requires POLICIES_POLICY_AUDIT permission.'
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Database ID of the policy',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns array of users with their roles.',
        isArray: true,
        type: PolicyCommentUserDTO,
        examples: {
            withUsers: {
                summary: 'Users found in policy',
                value: [
                    { label: 'ExampleUser', value: Examples.DID, roles: ['Administrator'], type: 'user' },
                    { label: 'User1', value: Examples.DID_2, roles: ['Project_Proponent'], type: 'user' }
                ]
            },
            empty: {
                summary: 'No users in policy',
                value: []
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        examples: {
            invalidId: {
                summary: 'Missing or invalid policy ID',
                value: { statusCode: 422, message: 'Invalid ID.' }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            disconnected: {
                summary: 'User was disconnected from policy',
                value: { statusCode: 500, message: 'You were disconnected from this policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getUsers(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<PolicyCommentUserDTO[]> {
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
        summary: 'Returns the list of published schemas in the target policy.',
        description: 'Returns only PUBLISHED schemas associated with the policy topic. Returns a subset of fields: uuid, name, version, iri, documentURL, contextURL. Requires POLICIES_POLICY_AUDIT permission.'
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Database ID of the policy',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO,
        examples: {
            withSchemas: {
                summary: 'Published schemas found',
                value: [{
                    uuid: '3eeb3f6b-da10-43fa-a247-a4df386278b5',
                    name: '6.2 Appendix 2: Project Risks Table',
                    version: '1.0.0',
                    iri: '#3eeb3f6b-da10-43fa-a247-a4df386278b5',
                    documentURL: 'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i',
                    contextURL: 'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
                }]
            },
            empty: {
                summary: 'No published schemas',
                value: []
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        examples: {
            invalidId: {
                summary: 'Missing or invalid policy ID',
                value: { statusCode: 422, message: 'Invalid ID.' }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            disconnected: {
                summary: 'User was disconnected from policy',
                value: { statusCode: 500, message: 'You were disconnected from this policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getSchemas(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
    ): Promise<SchemaDTO[]> {
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
        summary: 'Returns the list of documents in the target policy.',
        description: 'Returns paginated VC or VP documents from the policy. Only documents with a messageId (published to Hedera) are returned. Filter by type (VC or VP), owner DID, or schema IRI. Optionally load comment counts. Requires POLICIES_POLICY_AUDIT permission.'
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Database ID of the policy',
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
        description: 'Document type to filter by. If not VC or VP, returns empty array.',
        required: false,
        enum: ['VC', 'VP'],
        example: 'VC'
    })
    @ApiQuery({
        name: 'owner',
        type: String,
        description: 'Filter by document owner DID',
        required: false,
        example: Examples.DID
    })
    @ApiQuery({
        name: 'schema',
        type: String,
        description: 'Filter by document schema IRI',
        required: false,
        example: Examples.UUID
    })
    @ApiQuery({
        name: 'comments',
        type: Boolean,
        description: 'If true, includes comment count for each VC document',
        required: false
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns documents and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: VcDocumentDTO,
        examples: {
            vcDocuments: {
                summary: 'VC documents found (type=VC)',
                value: [ObjectExamples.VC_DOCUMENT_1]
            },
            vcWithComments: {
                summary: 'VC documents with comment count (type=VC, comments=true)',
                value: [{ ...ObjectExamples.VC_DOCUMENT_1, comments: 5 }]
            },
            vpDocuments: {
                summary: 'VP documents found (type=VP)',
                value: [ObjectExamples.VP_DOCUMENT]
            },
            empty: {
                summary: 'No documents (or type is not VC/VP)',
                value: []
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        examples: {
            invalidId: {
                summary: 'Missing or invalid policy ID',
                value: { statusCode: 422, message: 'Invalid ID.' }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            policyNotFound: {
                summary: 'Policy does not exist',
                value: { statusCode: 500, message: 'Policy does not exist.' }
            },
            insufficientPermissions: {
                summary: 'No access to this policy',
                value: { statusCode: 500, message: 'Insufficient permissions to execute the policy.' }
            },
            disconnected: {
                summary: 'User was disconnected from policy',
                value: { statusCode: 500, message: 'You were disconnected from this policy.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
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
    ): Promise<VcDocumentDTO[]> {
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
