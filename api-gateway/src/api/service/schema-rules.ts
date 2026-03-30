import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Response } from '@nestjs/common';
import { Permissions, UserPermissions } from '@guardian/interfaces';
import { ApiBody, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, UnprocessableEntityErrorDTO, ObjectExamples, SchemaRuleDTO, SchemaRuleDataDTO, SchemaRuleOptionsDTO, SchemaRuleRelationshipsDTO, pageHeader } from '#middlewares';
import { Guardians, InternalException, EntityOwner } from '#helpers';
import { AuthUser, Auth } from '#auth';

@Controller('schema-rules')
@ApiTags('schema-rules')
export class SchemaRulesApi {
    constructor(private readonly logger: PinoLogger) { }

    /**
     * Creates a new schema rule
     */
    @Post('/')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Creates a new schema rule.',
        description: 'Creates a new schema rule linked to a policy. Schema rules define validation and transformation logic applied to documents within the policy.',
    })
    @ApiBody({
        description: 'Schema rule configuration. Must include name, description, and policyId.',
        type: SchemaRuleDTO,
        required: true,
        examples: {
            createRule: {
                summary: 'Create a new schema rule',
                value: {
                    name: 'Test Schema Rule',
                    description: 'Description of test schema rule',
                    policyId: '69b83f18cd6b7c4adf4139bc'
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.SCHEMA_RULE
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createSchemaRule(
        @AuthUser() user: IAuthUser,
        @Body() rule: SchemaRuleDTO
    ): Promise<SchemaRuleDTO> {
        try {
            if (!rule) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.createSchemaRule(rule, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get page
     */
    @Get('/')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Return a list of all schema rules.',
        description: 'Returns a paginated list of schema rules owned by the current user. Optionally filter by policy ID.',
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
        description: 'Successful operation. Returns schema rules array and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: SchemaRuleDTO,
        examples: {
            withRules: {
                summary: 'Schema rules found (list returns fewer fields than GET /:id)',
                value: [ObjectExamples.SCHEMA_RULE_LIST_ITEM]
            },
            empty: {
                summary: 'No schema rules',
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRules(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyInstanceTopicId') policyInstanceTopicId?: string
    ): Promise<SchemaRuleDTO[]> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const { items, count } = await guardians.getSchemaRules({ policyInstanceTopicId, pageIndex, pageSize }, owner);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get schema rule by id
     */
    @Get('/:ruleId')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Retrieves schema rule.',
        description: 'Retrieves schema rule for the specified ID.'
    })
    @ApiParam({
        name: 'ruleId',
        type: String,
        description: 'Schema rule Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.SCHEMA_RULE
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRuleById(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getSchemaRuleById(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Update schema rule
     */
    @Put('/:ruleId')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Updates schema rule.',
        description: 'Updates schema rule configuration for the specified rule ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a configuration.',
        required: true,
        type: SchemaRuleDTO,
        examples: {
            updateRule: {
                summary: 'Update a schema rule',
                value: {
                    name: 'Updated Rule',
                    description: 'Updated description',
                    policyId: '69aeb71ef8c5b278e3bab4e5'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.SCHEMA_RULE
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string,
        @Body() item: SchemaRuleDTO
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getSchemaRuleById(ruleId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.updateSchemaRule(ruleId, item, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Delete schema rule
     */
    @Delete('/:ruleId')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Deletes the schema rule.',
        description: 'Deletes the schema rule with the provided ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<boolean> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.deleteSchemaRule(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Activate schema rule
     */
    @Put('/:ruleId/activate')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Activates schema rule.',
        description: 'Activates schema rule for the specified rule ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.SCHEMA_RULE
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async activateSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getSchemaRuleById(ruleId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.activateSchemaRule(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Inactivate schema rule
     */
    @Put('/:ruleId/inactivate')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Inactivates schema rule.',
        description: 'Inactivates schema rule for the specified rule ID.',
    })
    @ApiParam({
        name: 'ruleId',
        type: 'string',
        required: true,
        description: 'Schema Rule Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.SCHEMA_RULE
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async inactivateSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldItem = await guardians.getSchemaRuleById(ruleId, owner);
            if (!oldItem) {
                throw new HttpException('Item not found.', HttpStatus.NOT_FOUND);
            }
            return await guardians.inactivateSchemaRule(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get relationships by id
     */
    @Get('/:ruleId/relationships')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Retrieves schema rule relationships.',
        description: 'Retrieves schema rule relationships for the specified ID.'
    })
    @ApiParam({
        name: 'ruleId',
        type: String,
        description: 'Schema Rule Identifier',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaRuleRelationshipsDTO,
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
        context: {} }] }
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleRelationshipsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaRuleRelationships(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string
    ): Promise<SchemaRuleRelationshipsDTO> {
        try {
            if (!ruleId) {
                throw new HttpException('Invalid ID.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.getSchemaRuleRelationships(ruleId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get rules and data
     */
    @Post('/data')
    @Auth()
    @ApiOperation({
        summary: 'Retrieves schema rule data.',
        description: 'Retrieves schema rule data based on the provided options.',
    })
    @ApiBody({
        description: 'Options.',
        type: SchemaRuleOptionsDTO,
        required: true,
        examples: {
            getSchemaRuleData: {
                summary: 'Retrieve schema rule data for a document',
                value: {
                    policyId: '69aeb71ef8c5b278e3bab4e5',
                    schemaId: '69aeb71ef8c5b278e3bab4e5',
                    documentId: '69aeb71ef8c5b278e3bab4e5'
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: SchemaRuleDataDTO,
        isArray: true,
        examples: {
            default: {
                    summary: 'Default example',
                value: [{ rules: { id: Examples.DB_ID,
            uuid: Examples.DB_ID,
            name: 'Validation Rule',
            description: 'Description',
            creator: 'string',
            owner: 'string',
            policyId: Examples.DB_ID,
            policyTopicId: Examples.DB_ID,
            policyInstanceTopicId: Examples.DB_ID,
            status: 'string',
            config: {} },
            document: { id: Examples.DB_ID,
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
            jws: {} } } }] }]
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleOptionsDTO, SchemaRuleDataDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async getSchemaRuleData(
        @AuthUser() user: IAuthUser,
        @Body() options: SchemaRuleOptionsDTO
    ): Promise<SchemaRuleDataDTO[]> {
        try {
            if (!options) {
                throw new HttpException('Invalid config.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (!UserPermissions.has(user, Permissions.SCHEMAS_RULE_EXECUTE)) {
                return null;
            } else {
                const owner = new EntityOwner(user);
                const guardian = new Guardians();
                return await guardian.getSchemaRuleData(options, owner);
            }
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Import rules
     */
    @Post('/:policyId/import/file')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Imports new rules from a zip file.',
        description: 'Imports new rules from the provided zip file into the local DB.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'A binary/zip file containing rules to be imported.',
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: SchemaRuleDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.SCHEMA_RULE
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() zip: any
    ): Promise<SchemaRuleDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            return await guardian.importSchemaRule(zip, policyId, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Export rules
     */
    @Get('/:ruleId/export/file')
    @Auth(Permissions.SCHEMAS_RULE_READ)
    @ApiOperation({
        summary: 'Returns a zip file containing rules.',
        description: 'Returns a zip file containing rules.',
    })
    @ApiParam({
        name: 'ruleId',
        type: String,
        description: 'Schema Rule Identifier',
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportSchemaRule(
        @AuthUser() user: IAuthUser,
        @Param('ruleId') ruleId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportSchemaRule(ruleId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Preview schema rule
     */
    @Post('/import/file/preview')
    @Auth(Permissions.SCHEMAS_RULE_CREATE)
    @ApiOperation({
        summary: 'Imports a zip file containing rules.',
        description: 'Imports a zip file containing rules.',
    })
    @ApiBody({
        description: 'A binary/zip file containing rules to preview.',
    })
    @ApiOkResponse({
        description: 'Schema rule preview.',
        type: SchemaRuleDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.SCHEMA_RULE
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
            itemActive: {
                summary: 'Item is already active/inactive',
                value: { statusCode: 500, message: 'Item is already active.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(SchemaRuleDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async previewSchemaRule(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<any> {
        try {
            const owner = new EntityOwner(user);
            const guardian = new Guardians();
            return await guardian.previewSchemaRule(body, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
