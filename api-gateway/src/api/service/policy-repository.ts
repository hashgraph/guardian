import { Auth, AuthUser } from '#auth';
import { InternalException, PolicyEngine } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Param, Query, Response } from '@nestjs/common';
import { ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO,
    pageHeader,
    PolicyCommentUserDTO,
    SchemaDTO,
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
        summary: 'Returns the list of user names which are present in the policy',
        description: 'Returns the list of user names which are present in the policy'
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
        summary: 'Returns the list of schemas present in the target policy',
        description: 'Returns the list of schemas present in the target policy'
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
        summary: 'Returns the list of documents in the target policy',
        description: 'Returns the list of documents in the target policy'
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
        description: 'Document type',
        required: false,
        example: 'VC'
    })
    @ApiQuery({
        name: 'owner',
        type: String,
        description: 'Document owner',
        required: false,
        example: Examples.DID
    })
    @ApiQuery({
        name: 'schema',
        type: String,
        description: 'Document schema',
        required: false,
        example: Examples.UUID
    })
    @ApiQuery({
        name: 'comments',
        type: Boolean,
        description: 'Load comments',
        required: false
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: VcDocumentDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            hash: 'hash',
            signature: 0,
            status: 'NEW',
            tag: 'Block tag',
            type: 'Document type',
            createDate: 'string',
            updateDate: 'string',
            owner: 'string',
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
