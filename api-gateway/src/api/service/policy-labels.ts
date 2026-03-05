import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { ApiAcceptedResponse, ApiBody, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, PolicyLabelDocumentDTO, PolicyLabelDTO, PolicyLabelRelationshipsDTO, VcDocumentDTO, pageHeader, PolicyLabelDocumentRelationshipsDTO, PolicyLabelComponentsDTO, PolicyLabelFiltersDTO, TaskDTO } from '#middlewares';
import { Guardians, InternalException, EntityOwner, TaskManager, ServiceError } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('policy-labels')
@ApiTags('policy-labels')
export class PolicyLabelsApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new policy label
     */
    @Post('/')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Creates a new policy label.',
        description: 'Creates a new policy label.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: PolicyLabelDTO,
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Body() label: PolicyLabelDTO
    ): Promise<PolicyLabelDTO> {
        try {
            if (!label) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createPolicyLabel(label, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Return a list of all policy labels.',
        description: 'Returns all policy labels.',
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
        name: 'policyInstanceTopicId',
        type: String,
        description: 'Policy Instance Topic Id',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: PolicyLabelDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }]
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabels(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyInstanceTopicId') policyInstanceTopicId?: string
    ): Promise<PolicyLabelDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getPolicyLabels({
                policyInstanceTopicId, pageIndex, pageSize
            }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get policy label by id
     */
    @Get('/:definitionId')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Retrieves policy label.',
        description: 'Retrieves policy label for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelById(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<PolicyLabelDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getPolicyLabelById(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update policy label
     */
    @Put('/:definitionId')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Updates policy label.',
        description: 'Updates policy label configuration for the specified label ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'policy label Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: PolicyLabelDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updatePolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Body() item: PolicyLabelDTO
    ): Promise<PolicyLabelDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getPolicyLabelById(definitionId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updatePolicyLabel(definitionId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete policy label
     */
    @Delete('/:definitionId')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Deletes the policy label.',
        description: 'Deletes the policy label with the provided ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'policy label Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        example: true
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deletePolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<boolean> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deletePolicyLabel(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish policy label
     */
    @Put('/:definitionId/publish')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Publishes policy label.',
        description: 'Publishes policy label for the specified label ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'policy label Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<PolicyLabelDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getPolicyLabelById(definitionId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.publishPolicyLabel(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish policy label (Async)
     */
    @Put('/push/:definitionId/publish')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Publishes policy label.',
        description: 'Publishes policy label for the specified label ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'policy label Identifier',
        example: Examples.DB_ID,
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiNotFoundResponse({ description: 'Resource not found.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(TaskDTO, PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async publishPolicyLabelAsync(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<TaskDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getPolicyLabelById(definitionId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }

            const taskManager = new TaskManager();
            const task = taskManager.start(TaskAction.PUBLISH_POLICY_LABEL, user.id);
            RunFunctionAsync<ServiceError>(async () => {
                await guardians.publishPolicyLabelAsync(definitionId, owner, task);
            }, async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, { code: 500, message: error.message || error });
            });

            return task;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get relationships by id
     */
    @Get('/:definitionId/relationships')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Retrieves policy label relationships.',
        description: 'Retrieves policy label relationships for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelRelationshipsDTO,
        example: { policy: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] },
        policySchemas: [{ id: Examples.DB_ID,
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
        context: {} }],
        documentsSchemas: [{ id: Examples.DB_ID,
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
        context: {} }] }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelRelationships(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<PolicyLabelRelationshipsDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getPolicyLabelRelationships(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import labels
     */
    @Post('/:policyId/import/file')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Imports new labels from a zip file.',
        description: 'Imports new labels from the provided zip file into the local DB.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A zip file containing labels to be imported.',
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: PolicyLabelDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() zip: any
    ): Promise<PolicyLabelDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            return await guardian.importPolicyLabel(zip, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export labels
     */
    @Get('/:definitionId/export/file')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Returns a zip file containing labels.',
        description: 'Returns a zip file containing labels.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiProduces('application/zip')
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.',
        schema: {
            type: 'string',
            format: 'binary'
        },
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportPolicyLabel(definitionId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview policy label
     */
    @Post('/import/file/preview')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Imports a zip file containing labels.',
        description: 'Imports a zip file containing labels.',
    })
    @ApiBody({
        description: 'File.',
    })
    @ApiOkResponse({
        description: 'policy label preview.',
        type: PolicyLabelDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewPolicyLabel(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<PolicyLabelDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.previewPolicyLabel(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Search other labels ans statistics
     */
    @Post('/components')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Search labels ans statistics.',
        description: 'Return a list of other labels ans statistics.',
    })
    @ApiBody({
        description: 'Filters.',
        required: true,
        type: PolicyLabelFiltersDTO
    })
    @ApiOkResponse({
        description: 'A list of labels ans statistics.',
        type: PolicyLabelComponentsDTO,
        example: { statistics: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }],
            labels: [{ id: 'f3b2a9c1e4d5678901234567',
            uuid: 'f3b2a9c1e4d5678901234567',
            name: 'Tool name',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: 'f3b2a9c1e4d5678901234567',
            messageId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            status: 'string',
            config: {} }] }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelFiltersDTO, PolicyLabelComponentsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async searchComponents(
        @AuthUser() user: IAuthUser,
        @Body() body: PolicyLabelFiltersDTO
    ): Promise<PolicyLabelComponentsDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.searchComponents(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get documents
     */
    @Get('/:definitionId/tokens')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Return a list of all documents.',
        description: 'Returns all documents.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'policy label Identifier',
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(VcDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelTokens(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('definitionId') definitionId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<VcDocumentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getPolicyLabelTokens(definitionId, owner, pageIndex, pageSize);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get document
     */
    @Get('/:definitionId/tokens/:documentId')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Return a list of all documents.',
        description: 'Returns all documents.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'policy label Identifier',
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
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(VcDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicyLabelDocument(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Param('documentId') documentId: string,
    ): Promise<VcDocumentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.getPolicyLabelTokenDocuments(documentId, definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Creates a new label document
     */
    @Post('/:definitionId/documents')
    @Auth(Permissions.STATISTICS_LABEL_CREATE)
    @ApiOperation({
        summary: 'Creates a new label document.',
        description: 'Creates a new label document.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'policy label Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Configuration.',
        type: PolicyLabelDocumentDTO,
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: PolicyLabelDocumentDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            definitionId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            topicId: 'f3b2a9c1e4d5678901234567',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            target: 'string',
            relationships: ['message-id'],
            document: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createStatisticDocument(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Body() document: PolicyLabelDocumentDTO
    ): Promise<PolicyLabelDocumentDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (!document) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createLabelDocument(definitionId, document, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/:definitionId/documents')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Return a list of all label documents.',
        description: 'Returns all label documents.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'policy label Identifier',
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
        type: PolicyLabelDocumentDTO,
        example: [{ id: 'f3b2a9c1e4d5678901234567',
            definitionId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            topicId: 'f3b2a9c1e4d5678901234567',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            target: 'string',
            relationships: [Examples.MESSAGE_ID],
            document: {} }]
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getLabelDocuments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('definitionId') definitionId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<PolicyLabelDocumentDTO[]> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getLabelDocuments(definitionId, { pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get label document by id
     */
    @Get('/:definitionId/documents/:documentId')
    @Auth(Permissions.STATISTICS_LABEL_READ)
    @ApiOperation({
        summary: 'Retrieves label document.',
        description: 'Retrieves label document for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Label Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Label Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDocumentDTO,
        example: { id: 'f3b2a9c1e4d5678901234567',
            definitionId: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            policyTopicId: 'f3b2a9c1e4d5678901234567',
            policyInstanceTopicId: 'f3b2a9c1e4d5678901234567',
            topicId: 'f3b2a9c1e4d5678901234567',
            creator: 'string',
            owner: 'string',
            messageId: 'f3b2a9c1e4d5678901234567',
            target: 'string',
            relationships: ['message-id'],
            document: {} }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getLabelDocument(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Param('documentId') documentId: string
    ): Promise<PolicyLabelDocumentDTO> {
        try {
            if (!definitionId || !documentId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getLabelDocument(definitionId, documentId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get label document relationships
     */
    @Get('/:definitionId/documents/:documentId/relationships')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves documents relationships.',
        description: 'Retrieves documents relationships for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'documentId',
        type: String,
        description: 'Label Document Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PolicyLabelDocumentRelationshipsDTO,
        example: { target: { id: 'f3b2a9c1e4d5678901234567',
            policyId: 'f3b2a9c1e4d5678901234567',
            hash: 'hash',
            signature: 0,
            status: 'NEW',
            tag: 'Block tag',
            type: 'Document type',
            createDate: 'string',
            updateDate: 'string',
            owner: 'string',
            document: [{ id: 'f3b2a9c1e4d5678901234567',
            type: [{}],
            verifiableCredential: [{}],
            proof: { type: {},
            created: {},
            verificationMethod: {},
            proofPurpose: {},
            jws: {} } }] },
            relationships: [{ id: 'f3b2a9c1e4d5678901234567',
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
            type: [{}],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: {},
            created: {},
            verificationMethod: {},
            proofPurpose: {},
            jws: {} } } }] }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: InternalServerErrorDTO, example: { result: 'ok' }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(PolicyLabelDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticAssessmentRelationships(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Param('documentId') documentId: string
    ): Promise<PolicyLabelDocumentRelationshipsDTO> {
        try {
            if (!definitionId || !documentId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getLabelDocumentRelationships(definitionId, documentId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
