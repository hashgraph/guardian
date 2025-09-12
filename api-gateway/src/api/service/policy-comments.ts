import { Auth, AuthUser } from '#auth';
import { CACHE, POLICY_REQUIRED_PROPS, PREFIXES } from '#constants';
import { AnyFilesInterceptor, CacheService, EntityOwner, getCacheKey, InternalException, ONLY_SR, PolicyEngine, ProjectService, ServiceError, TaskManager, UploadedFiles, UseCache, parseSavepointIdsJson } from '#helpers';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { DocumentType, Permissions, PolicyHelper, TaskAction, UserRole } from '@guardian/interfaces';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, UseInterceptors, Version, Patch } from '@nestjs/common';
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
     * Get chats
     */
    @Get('/:policyId/:documentId/chats')
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
    async getChats(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
    ): Promise<any> {
        try {
            if (!policyId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const engineService = new PolicyEngine();
            return await engineService.getPolicyChats(user, policyId, documentId);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create chat
     */
    @Post('/:policyId/:documentId/chats')
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
    async createChat(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
        @Body() body: {
            name: string,
            relationships: string[]
        }
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.createPolicyChat(user, policyId, documentId, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create policy comment
     */
    @Post('/:policyId/:documentId/comments')
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
        @Body() body: {
            chatId?: string,
            anchor?: string;
            recipients?: string[];
            text?: string;
            files?: string[];
        }
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            return await engineService.createPolicyComment(user, policyId, documentId, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Return a list of comments
     */
    @Post('/:policyId/:documentId/comments/search')
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
        @Response() res: any,
        @Body() body: {
            chatId?: string,
            anchor?: string,
            sender?: string,
            senderRole?: string,
            private?: boolean,
            lt?: string,
            gt?: string
        },
        @Param('policyId') policyId: string,
        @Param('documentId') documentId: string,
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const { comments, count } = await engineService.getPolicyComments(user, policyId, documentId, body);
            return res.header('X-Total-Count', count).send(comments);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
