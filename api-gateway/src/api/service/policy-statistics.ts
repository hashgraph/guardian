import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiBody, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, UnprocessableEntityErrorDTO, StatisticDefinitionDTO, StatisticAssessmentDTO, VcDocumentDTO, pageHeader, StatisticAssessmentRelationshipsDTO, StatisticDefinitionRelationshipsDTO } from '#middlewares';
import { Guardians, InternalException, EntityOwner } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('policy-statistics')
@ApiTags('policy-statistics')
export class PolicyStatisticsApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new statistic definition
     */
    @Post('/')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Creates a new statistic definition.',
        description: 'Creates a new statistic definition linked to a policy. Defines metrics and rules for collecting and aggregating policy document data.',
    })
    @ApiBody({
        description: 'Configuration.',
        type: StatisticDefinitionDTO,
        required: true,
        examples: {
            createDefinition: {
                summary: 'Create a new statistic definition',
                value: {
                    name: 'Carbon Stats',
                    description: 'Track emissions reductions',
                    policyId: '69aeb71ef8c5b278e3bab4e5'
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Carbon Statistics',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            status: 'string',
            config: {} }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Body() definition: StatisticDefinitionDTO
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definition) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createStatisticDefinition(definition, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all statistic definitions.',
        description: 'Returns a paginated list of statistic definitions owned by the current user. Optionally filter by policy instance topic ID.',
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
        description: 'Successful operation. Returns statistic definitions array and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: StatisticDefinitionDTO,
        examples: {
            withDefinitions: {
                summary: 'Statistic definitions found',
                value: [{
                    id: Examples.DB_ID,
                    name: 'Carbon Emission Statistics',
                    description: 'Tracks carbon emission reductions across policy documents',
                    creator: Examples.DID,
                    owner: Examples.DID,
                    topicId: Examples.ACCOUNT_ID,
                    messageId: Examples.MESSAGE_ID,
                    policyId: Examples.DB_ID,
                    status: 'DRAFT',
                    config: {}
                }]
            },
            empty: {
                summary: 'No statistic definitions',
                value: []
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticDefinitions(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyInstanceTopicId') policyInstanceTopicId?: string
    ): Promise<StatisticDefinitionDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatisticDefinitions({ policyInstanceTopicId, pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get statistic by id
     */
    @Get('/:definitionId')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic definition.',
        description: 'Retrieves statistic definition for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Carbon Statistics',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            status: 'string',
            config: {} }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticDefinitionById(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticDefinitionById(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update statistic definition
     */
    @Put('/:definitionId')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Updates statistic definition.',
        description: 'Updates statistic definition configuration for the specified statistic ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: StatisticDefinitionDTO,
        examples: {
            updateDefinition: {
                summary: 'Update a statistic definition',
                value: {
                    name: 'Updated Carbon Stats',
                    description: 'Updated description for emissions tracking',
                    policyId: '69aeb71ef8c5b278e3bab4e5'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Carbon Statistics',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            status: 'string',
            config: {} }
            }
        }
    })
    @ApiNotFoundResponse({ description: 'Item not found.', type: InternalServerErrorDTO, examples: { default: { summary: 'Default example', value: { statusCode: 404, message: 'Item not found.' } }}})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Body() item: StatisticDefinitionDTO
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getStatisticDefinitionById(definitionId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updateStatisticDefinition(definitionId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete statistic definition
     */
    @Delete('/:definitionId')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Deletes the statistic definition.',
        description: 'Deletes the statistic definition with the provided ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean,
        examples: {
            default: {
                    summary: 'Default example',
                value: true
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<boolean> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deleteStatisticDefinition(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Publish statistic definition
     */
    @Put('/:definitionId/publish')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Publishes statistic definition.',
        description: 'Publishes statistic definition for the specified statistic ID.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Carbon Statistics',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            status: 'string',
            config: {} }
            }
        }
    })
    @ApiNotFoundResponse({ description: 'Item not found.', type: InternalServerErrorDTO, examples: { default: { summary: 'Default example', value: { statusCode: 404, message: 'Item not found.' } }}})
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<StatisticDefinitionDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getStatisticDefinitionById(definitionId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.publishStatisticDefinition(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get relationships by id
     */
    @Get('/:definitionId/relationships')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic relationships.',
        description: 'Retrieves statistic relationships for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionRelationshipsDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { policy: { id: Examples.DB_ID,
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
        schemas: [{ id: Examples.DB_ID,
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
        schema: { id: Examples.DB_ID,
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
        context: {} } }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticRelationships(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string
    ): Promise<StatisticDefinitionRelationshipsDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticRelationships(definitionId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/:definitionId/documents')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all documents.',
        description: 'Returns all documents.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
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
        examples: {
            default: {
                    summary: 'Default example',
                value: [{ id: Examples.DB_ID,
            policyId: Examples.DB_ID,
            hash: 'hash',
            signature: 0,
            status: 'NEW',
            tag: 'Block tag',
            type: 'Document type',
            createDate: 'string',
            updateDate: 'string',
            owner: 'string',
            document: { id: Examples.DB_ID,
            type: ['string'],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: 'string',
            created: 'string',
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
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(VcDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticDocuments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('definitionId') definitionId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<VcDocumentDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatisticDocuments(definitionId, owner, pageIndex, pageSize);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Creates a new statistic assessment
     */
    @Post('/:definitionId/assessment')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Creates a new statistic assessment.',
        description: 'Creates a new statistic assessment.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Configuration.',
        type: StatisticAssessmentDTO,
        required: true,
        examples: {
            createAssessment: {
                summary: 'Create a new statistic assessment',
                value: {
                    definitionId: '69aeb71ef8c5b278e3bab4e5',
                    policyId: '69aeb71ef8c5b278e3bab4e5',
                    target: '69aeb71ef8c5b278e3bab4e5',
                    document: {}
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: StatisticAssessmentDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            definitionId: Examples.DB_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            topicId: Examples.ACCOUNT_ID,
            creator: 'string',
            owner: 'string',
            messageId: Examples.MESSAGE_ID,
            target: 'string',
            relationships: ['message-id'],
            document: {} }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticAssessmentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createStatisticAssessment(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Body() assessment: StatisticAssessmentDTO
    ): Promise<StatisticAssessmentDTO> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (!assessment) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createStatisticAssessment(definitionId, assessment, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/:definitionId/assessment')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Return a list of all statistic assessment.',
        description: 'Returns all statistic assessment.',
    })
    @ApiParam({
        name: 'definitionId',
        type: 'string',
        required: true,
        description: 'Statistic Definition Identifier',
        example: Examples.DB_ID,
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
        type: StatisticAssessmentDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: [{ id: Examples.DB_ID,
            definitionId: Examples.DB_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            topicId: Examples.ACCOUNT_ID,
            creator: 'string',
            owner: 'string',
            messageId: Examples.MESSAGE_ID,
            target: 'string',
            relationships: [Examples.MESSAGE_ID],
            document: {} }]
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticAssessmentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticAssessments(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('definitionId') definitionId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<StatisticAssessmentDTO[]> {
        try {
            if (!definitionId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getStatisticAssessments(definitionId, { pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get statistic assessment by id
     */
    @Get('/:definitionId/assessment/:assessmentId')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves statistic assessment.',
        description: 'Retrieves statistic assessment for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'assessmentId',
        type: String,
        description: 'Statistic Assessment Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticAssessmentDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            definitionId: Examples.DB_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            topicId: Examples.ACCOUNT_ID,
            creator: 'string',
            owner: 'string',
            messageId: Examples.MESSAGE_ID,
            target: 'string',
            relationships: ['message-id'],
            document: {} }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticAssessment(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Param('assessmentId') assessmentId: string
    ): Promise<StatisticAssessmentDTO> {
        try {
            if (!definitionId || !assessmentId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticAssessment(definitionId, assessmentId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get assessment relationships
     */
    @Get('/:definitionId/assessment/:assessmentId/relationships')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Retrieves assessment relationships.',
        description: 'Retrieves assessment relationships for the specified ID.'
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiParam({
        name: 'assessmentId',
        type: String,
        description: 'Statistic Assessment Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: StatisticAssessmentRelationshipsDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { target: { id: Examples.DB_ID,
            policyId: Examples.DB_ID,
            hash: 'hash',
            signature: 0,
            status: 'NEW',
            tag: 'Block tag',
            type: 'Document type',
            createDate: 'string',
            updateDate: 'string',
            owner: 'string',
            document: { id: Examples.DB_ID,
            type: ['string'],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: 'string',
            created: 'string',
            verificationMethod: 'string',
            proofPurpose: 'string',
            jws: 'string' } } },
            relationships: [{ id: Examples.DB_ID,
            policyId: Examples.DB_ID,
            hash: 'hash',
            signature: 0,
            status: 'NEW',
            tag: 'Block tag',
            type: 'Document type',
            createDate: 'string',
            updateDate: 'string',
            owner: 'string',
            document: { id: Examples.DB_ID,
            type: [{}],
            credentialSubject: {},
            issuer: {},
            issuanceDate: 'string',
            proof: { type: {},
            created: {},
            verificationMethod: {},
            proofPurpose: {},
            jws: {} } } }] }
            }
        }
    })
    @ApiUnprocessableEntityResponse({ description: 'Unprocessable entity.', type: UnprocessableEntityErrorDTO, examples: { invalidId: { summary: 'Missing or invalid ID', value: { statusCode: 422, message: 'Invalid ID.' } }, invalidConfig: { summary: 'Missing or invalid config', value: { statusCode: 422, message: 'Invalid config.' } } }})
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getStatisticAssessmentRelationships(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Param('assessmentId') assessmentId: string
    ): Promise<StatisticAssessmentRelationshipsDTO> {
        try {
            if (!definitionId || !assessmentId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getStatisticAssessmentRelationships(definitionId, assessmentId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import statistic definition
     */
    @Post('/:policyId/import/file')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Imports new statistic definition from a zip file.',
        description: 'Imports new statistic definition from the provided zip file into the local DB.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A binary/zip file containing statistic definition to be imported.',
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: StatisticDefinitionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Carbon Statistics',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            status: 'string',
            config: {} }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() zip: any
    ): Promise<StatisticDefinitionDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            return await guardian.importStatisticDefinition(zip, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export statistic definition
     */
    @Get('/:definitionId/export/file')
    @Auth(Permissions.STATISTICS_STATISTIC_READ)
    @ApiOperation({
        summary: 'Returns a zip file containing statistic definition.',
        description: 'Returns a zip file containing statistic definition.',
    })
    @ApiParam({
        name: 'definitionId',
        type: String,
        description: 'Statistic Definition Identifier',
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
        examples: {
            default: {
                    summary: 'Default example',
                value: { result: 'ok' }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Param('definitionId') definitionId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportStatisticDefinition(definitionId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview statistic definition
     */
    @Post('/import/file/preview')
    @Auth(Permissions.STATISTICS_STATISTIC_CREATE)
    @ApiOperation({
        summary: 'Imports a zip file containing statistic definition.',
        description: 'Imports a zip file containing statistic definition.',
    })
    @ApiBody({
        description: 'A binary/zip file containing statistic definition to preview.',
    })
    @ApiOkResponse({
        description: 'Statistic definition preview.',
        type: StatisticDefinitionDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Carbon Statistics',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            status: 'string',
            config: {} }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            itemNotFound: {
                summary: 'Item does not exist',
                value: { statusCode: 500, message: 'Item does not exist.' }
            },
            itemPublished: {
                summary: 'Item is already published or in wrong state',
                value: { statusCode: 500, message: 'Item already published.' }
            },
            notPublished: {
                summary: 'Item is not published (for assessments)',
                value: { statusCode: 500, message: 'Item is not published.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(StatisticDefinitionDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewStatisticDefinition(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.previewStatisticDefinition(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
