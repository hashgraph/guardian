import { ISchema, Permissions, SchemaCategory, SchemaEntity, SchemaHelper, SchemaStatus, StatusType, TaskAction } from '@guardian/interfaces';
import { IAuthUser, Logger, RunFunctionAsync, SchemaImportExport } from '@guardian/common';
import { ApiParam, ApiQuery, ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, Req, Response, Version } from '@nestjs/common';
import { AuthUser, Auth } from '#auth';
import { Client, ClientProxy, Transport } from '@nestjs/microservices';
import { ExportSchemaDTO, InternalServerErrorDTO, MessageSchemaDTO, SchemaDTO, SystemSchemaDTO, TaskDTO, VersionSchemaDTO, Examples, pageHeader } from '#middlewares';
import { CACHE, PREFIXES, SCHEMA_REQUIRED_PROPS } from '#constants';
import { Guardians, TaskManager, ServiceError, SchemaUtils, UseCache, ONLY_SR, InternalException, EntityOwner, CacheService, getCacheKey } from '#helpers';
import process from 'process';

@Controller('schema')
@ApiTags('schema')
export class SingleSchemaApi {
    /**
     * Returns schema by schema ID.
     */
    @Get('/:schemaId')
    @Auth()
    @ApiOperation({
        summary: 'Returns schema by schema ID.',
        description: 'Returns schema by schema ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @UseCache({ ttl: CACHE.SHORT_TTL })
    @HttpCode(HttpStatus.OK)
    async getSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
    ): Promise<SchemaDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const schema = await guardians.getSchemaById(schemaId);
            if (!schema) {
                throw new HttpException(`Schema not found.`, HttpStatus.NOT_FOUND);
            }
            if (schema.system && !schema.active && schema.owner !== user.username && schema.owner !== owner.creator) {
                throw new HttpException(`Schema not found.`, HttpStatus.NOT_FOUND);
            }
            if (!schema.system && schema.status !== SchemaStatus.PUBLISHED && schema.owner !== owner.owner) {
                throw new HttpException(`Schema not found.`, HttpStatus.NOT_FOUND);
            }
            SchemaHelper.updatePermission([schema], owner);
            return SchemaUtils.toOld(schema);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Returns all parent schemas.
     */
    @Get('/:schemaId/parents')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.AUDITOR ?,
        // UserRole.USER ?
    )
    @ApiOperation({
        summary: 'Returns all parent schemas.',
        description: 'Returns all parent schemas.',
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema identifier',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaParents(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const schemas = await guardians.getSchemaParents(schemaId, owner);
            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Returns all parent schemas.
     */
    @Get('/:schemaId/tree')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.AUDITOR ?,
        // UserRole.USER ?
    )
    @ApiOperation({
        summary: 'Returns schema tree.',
        description: 'Returns schema tree.',
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema identifier',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string'
                },
                type: {
                    type: 'string'
                },
                children: {
                    type: 'array',
                    items: {
                        type: 'object'
                    }
                }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaTree(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            return await guardians.getSchemaTree(schemaId, owner);
        } catch (error) {
            await InternalException(error);
        }
    }
}

@Controller('schemas')
@ApiTags('schemas')
export class SchemaApi {
    constructor(private readonly cacheService: CacheService) {
    }

    @Client({
        transport: Transport.NATS,
        options: {
            // name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ]
        }
    })
    client: ClientProxy;

    /**
     * 'Return a list of all schemas.
     */
    @Get('/')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.AUDITOR ?,
        // UserRole.USER ?
    )
    @ApiOperation({
        summary: 'Return a list of all schemas.',
        description: 'Returns all schemas.',
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
        name: 'category',
        type: String,
        description: 'Schema category',
        required: false,
        example: SchemaCategory.POLICY
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'moduleId',
        type: String,
        description: 'Module id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'toolId',
        type: String,
        description: 'Tool id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'topicId',
        type: String,
        description: 'Topic id',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getSchemasPage(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('category') category?: string,
        @Query('policyId') policyId?: string,
        @Query('moduleId') moduleId?: string,
        @Query('toolId') toolId?: string,
        @Query('topicId') topicId?: string
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const options: any = {};
            if (pageSize) {
                options.pageIndex = pageIndex;
                options.pageSize = pageSize;
            }
            if (category) {
                options.category = category;
            }
            if (topicId) {
                options.topicId = topicId;
            }
            if (policyId) {
                options.policyId = policyId;
            }
            if (moduleId) {
                options.moduleId = moduleId;
            }
            if (toolId) {
                options.toolId = toolId;
            }
            const { items, count } = await guardians.getSchemasByOwner(options, owner);
            SchemaHelper.updatePermission(items, owner);
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Return a list of all schemas 30.05.2024 V2.
     */
    @Get('/')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.AUDITOR ?,
        // UserRole.USER ?
    )
    @ApiOperation({
        summary: 'Return a list of all schemas.',
        description: 'Returns all schemas.',
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
        name: 'category',
        type: String,
        description: 'Schema category',
        required: false,
        example: SchemaCategory.POLICY
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'moduleId',
        type: String,
        description: 'Module id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'toolId',
        type: String,
        description: 'Tool id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'topicId',
        type: String,
        description: 'Topic id',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @Version('2')
    async getSchemasPageV2(
        @AuthUser() user: IAuthUser,
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Query('category') category: string,
        @Query('policyId') policyId: string,
        @Query('moduleId') moduleId: string,
        @Query('toolId') toolId: string,
        @Query('topicId') topicId: string,
        @Response() res: any
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const options: any = {};
            if (pageSize) {
                options.pageIndex = pageIndex;
                options.pageSize = pageSize;
            }
            if (category) {
                options.category = category;
            }
            if (topicId) {
                options.topicId = topicId;
            }
            if (policyId) {
                options.policyId = policyId;
            }
            if (moduleId) {
                options.moduleId = moduleId;
            }
            if (toolId) {
                options.toolId = toolId;
            }

            options.fields = Object.values(SCHEMA_REQUIRED_PROPS)

            const { items, count } = await guardians.getSchemasByOwnerV2(options, owner);
            SchemaHelper.updatePermission(items, owner);
            const schemas = SchemaUtils.toOld(items)

            return res.header('X-Total-Count', count).send(schemas);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get page
     */
    @Get('/:topicId')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
        // UserRole.AUDITOR ?,
        // UserRole.USER ?
    )
    @ApiOperation({
        summary: 'Return a list of all schemas.',
        description: 'Returns all schemas.',
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
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
        name: 'category',
        type: String,
        description: 'Schema category',
        required: false,
        example: SchemaCategory.POLICY
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getSchemasPageByTopicId(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('topicId') topicId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('category') category?: string,
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const options: any = {};
            if (pageSize) {
                options.pageIndex = pageIndex;
                options.pageSize = pageSize;
            }
            if (category) {
                options.category = category;
            }
            if (topicId) {
                options.topicId = topicId;
            }
            const { items, count } = await guardians.getSchemasByOwner(options, owner);
            SchemaHelper.updatePermission(items, owner);
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get schema by type
     */
    @Get('/type/:schemaType')
    @Auth()
    @ApiOperation({
        summary: 'Finds the schema using the json document type.',
        description: 'Finds the schema using the json document type.',
    })
    @ApiParam({
        name: 'schemaType',
        type: String,
        description: 'Type',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaByType(
        @AuthUser() user: IAuthUser,
        @Param('schemaType') schemaType: string
    ): Promise<SchemaDTO> {
        let schema: ISchema;
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            schema = await guardians.getSchemaByType(schemaType);
            if (!schema) {
                throw new HttpException(`Schema not found: ${schemaType}`, HttpStatus.NOT_FOUND);
            }
            if (schema.system && !schema.active && schema.owner !== owner.username && schema.owner !== owner.creator) {
                throw new HttpException(`Schema not found: ${schemaType}`, HttpStatus.NOT_FOUND);
            }
            if (!schema.system && schema.status !== SchemaStatus.PUBLISHED && schema.owner !== owner.owner) {
                throw new HttpException(`Schema not found: ${schemaType}`, HttpStatus.NOT_FOUND);
            }
            return {
                uuid: schema.uuid,
                iri: schema.iri,
                name: schema.name,
                version: schema.version,
                document: schema.document,
                documentURL: schema.documentURL,
                context: schema.context,
                contextURL: schema.contextURL,
            };
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get all schemas
     */
    @Get('/list/all')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
        Permissions.POLICIES_POLICY_READ,
        Permissions.MODULES_MODULE_READ,
        Permissions.TOOLS_TOOL_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns a list of schemas.',
        description: 'Returns a list of schemas.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getAll(
        @AuthUser() user: IAuthUser
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            if (user.did) {
                const owner = new EntityOwner(user);
                return await guardians.getListSchemas(owner);
            } else {
                return [];
            }
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get sub schemas
     */
    @Get('/list/sub')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_UPDATE,
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.MODULES_MODULE_UPDATE,
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns a list of schemas.',
        description: 'Returns a list of schemas.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: false,
        example: '0.0.1'
    })
    @ApiQuery({
        name: 'category',
        type: String,
        description: 'Schema category',
        required: false,
        example: SchemaCategory.POLICY
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getSub(
        @AuthUser() user: IAuthUser,
        @Query('category') category?: string,
        @Query('topicId') topicId?: string
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            if (!user.did) {
                return [];
            }
            const owner = new EntityOwner(user);
            return await guardians.getSubSchemas(category, topicId, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get schema by id with sub schemas
     */
    @Get('schema-with-sub-schemas')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_UPDATE,
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.MODULES_MODULE_UPDATE,
        Permissions.TOOLS_TOOL_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns a list of schemas.',
        description: 'Returns a list of schemas.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: false,
        example: '0.0.1'
    })
    @ApiQuery({
        name: 'category',
        type: String,
        description: 'Schema category',
        required: false,
        example: SchemaCategory.POLICY
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getSchemaWithSubSchemas(
        @AuthUser() user: IAuthUser,
        @Query('category') category: string,
        @Query('topicId') topicId: string,
        @Query('schemaId') schemaId: string,
    ): Promise<{schema: SchemaDTO, subSchemas: SchemaDTO[]} | {}> {
        try {
            const guardians = new Guardians();
            if (!user.did) {
                return {};
            }
            const owner = new EntityOwner(user);

            let promiseSchema: Promise<ISchema | void> = new Promise<void>(resolve => resolve())

            if(schemaId) {
                promiseSchema = guardians.getSchemaById(schemaId)
            }

            const [schema, subSchemas] =
                await Promise.all([promiseSchema, guardians.getSubSchemas(category, topicId, owner)]);

            return { schema, subSchemas };
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Create Schema
     */
    @Post('/:topicId')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new schema.',
        description: 'Creates a new schema.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'Object that contains a valid schema.',
        required: true,
        type: SchemaDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async createNewSchema(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() newSchema: SchemaDTO,
        @Req() req
    ): Promise<SchemaDTO[]> {
        try {
            SchemaUtils.fromOld(newSchema);
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            newSchema.topicId = topicId;
            newSchema.category = newSchema.category || SchemaCategory.POLICY;
            SchemaHelper.checkSchemaKey(newSchema);

            SchemaHelper.updateOwner(newSchema, owner);
            const schemas = await guardians.createSchema(newSchema, owner);
            SchemaHelper.updatePermission(schemas, owner);

            await this.cacheService.invalidate(getCacheKey([req.url], user))

            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Create Schema (Async)
     */
    @Post('/push/copy')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Copy schema.',
        description: 'Copy schema.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains a valid schema.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async copySchemaAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: any
    ): Promise<TaskDTO> {
        const taskManager = new TaskManager();
        const guardians = new Guardians();
        const owner = new EntityOwner(user);
        const task = taskManager.start(TaskAction.CREATE_SCHEMA, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const { iri, topicId, name } = body;
            taskManager.addStatus(task.taskId, 'Check schema version', StatusType.PROCESSING);
            await guardians.copySchemaAsync(iri, topicId, name, owner, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Create Schema (Async)
     */
    @Post('/push/:topicId')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new schema.',
        description: 'Creates a new schema.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'Object that contains a valid schema.',
        required: true,
        type: SchemaDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async createNewSchemaAsync(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() newSchema: SchemaDTO
    ): Promise<TaskDTO> {
        const owner = new EntityOwner(user);
        const guardians = new Guardians();
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_SCHEMA, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            SchemaUtils.fromOld(newSchema);
            taskManager.addStatus(task.taskId, 'Check schema version', StatusType.PROCESSING);
            newSchema.topicId = topicId;
            newSchema.category = newSchema.category || SchemaCategory.POLICY;
            SchemaHelper.checkSchemaKey(newSchema);
            SchemaHelper.updateOwner(newSchema, owner);

            await guardians.createSchemaAsync(newSchema, owner, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Update Schema
     */
    @Put('/')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates the schema.',
        description: 'Updates the schema.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains a valid schema.',
        required: true,
        type: SchemaDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setSchema(
        @AuthUser() user: IAuthUser,
        @Body() newSchema: SchemaDTO,
        @Req() req
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const schema = await guardians.getSchemaById(newSchema.id);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
            }
            const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.POLICY);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN)
            }
            if (schema.status === SchemaStatus.PUBLISHED) {
                throw new HttpException('Schema is published.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            SchemaUtils.fromOld(newSchema);
            SchemaHelper.checkSchemaKey(newSchema);

            SchemaHelper.updateOwner(newSchema, owner);
            const schemas = await guardians.updateSchema(newSchema, owner);
            SchemaHelper.updatePermission(schemas, owner);

            const invalidedCacheKeys = [`${PREFIXES.SCHEMES}schema-with-sub-schemas`];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Delete Schema
     */
    @Delete('/:schemaId')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes the schema with the provided schema ID.',
        description: 'Deletes the schema with the provided schema ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Req() req
    ): Promise<SchemaDTO[]> {
        const guardians = new Guardians();
        let schema: ISchema;
        const owner = new EntityOwner(user);

        try {
            schema = await guardians.getSchemaById(schemaId);
        } catch (error) {
            await InternalException(error);
        }
        if (!schema) {
            throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
        }
        const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.POLICY);
        if (error) {
            throw new HttpException(error, HttpStatus.FORBIDDEN)
        }
        if (schema.status === SchemaStatus.PUBLISHED) {
            throw new HttpException('Schema is published.', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const schemas = (await guardians.deleteSchema(schemaId, owner, true) as ISchema[]);
            SchemaHelper.updatePermission(schemas, owner);

            await this.cacheService.invalidate(getCacheKey([req.url], user))

            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Publish Schema
     */
    @Put('/:schemaId/publish')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the schema with the provided schema ID.',
        description: 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: VersionSchemaDTO,
        examples: {
            Version: {
                value: {
                    version: '1.0.0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(VersionSchemaDTO, SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async publishSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Body() option: VersionSchemaDTO,
        @Req() req,
        @Response() res: any
    ): Promise<SchemaDTO[]> {
        const guardians = new Guardians();
        const { version } = option;
        let schema: ISchema;
        let allVersion: ISchema[];
        const owner = new EntityOwner(user);
        try {
            schema = await guardians.getSchemaById(schemaId);
        } catch (error) {
            await InternalException(error);
        }
        if (!schema) {
            throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
        }
        try {
            allVersion = await guardians.getSchemasByUUID(schema.uuid);
        } catch (error) {
            await InternalException(error);
        }
        const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.POLICY);
        if (error) {
            throw new HttpException(error, HttpStatus.FORBIDDEN)
        }
        if (schema.status === SchemaStatus.PUBLISHED) {
            throw new HttpException('Schema is published.', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        if (allVersion.findIndex(s => s.version === version) !== -1) {
            throw new HttpException('Version already exists.', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            await guardians.publishSchema(schemaId, version, owner);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY
            }, owner);
            SchemaHelper.updatePermission(items, owner);

            const invalidedCacheKeys = [`${PREFIXES.SCHEMES}schema-with-sub-schemas`];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Publish Schema (Async)
     */
    @Put('/push/:schemaId/publish')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Publishes the schema with the provided schema ID.',
        description: 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: VersionSchemaDTO,
        examples: {
            Version: {
                value: {
                    version: '1.0.0'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, VersionSchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async publishSchemaAsync(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Body() option: VersionSchemaDTO,
        @Req() req
    ): Promise<TaskDTO> {
        const guardians = new Guardians();
        const owner = new EntityOwner(user);
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            throw new HttpException('Schema not found', HttpStatus.NOT_FOUND)
        }
        const notAllowed = SchemaUtils.checkPermission(schema, owner, SchemaCategory.POLICY);
        if (notAllowed) {
            throw new HttpException(notAllowed, HttpStatus.FORBIDDEN)
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PUBLISH_SCHEMA, user.id);
        const version = option.version;
        RunFunctionAsync<ServiceError>(async () => {
            if (schema.status === SchemaStatus.PUBLISHED) {
                taskManager.addError(task.taskId, { code: 500, message: 'Schema is published.' });
                return;
            }
            const allVersion = await guardians.getSchemasByUUID(schema.uuid);
            if (allVersion.findIndex(s => s.version === version) !== -1) {
                taskManager.addError(task.taskId, { code: 500, message: 'Version already exists.' });
                return;
            }
            await guardians.publishSchemaAsync(schemaId, version, owner, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        const invalidedCacheKeys = [`${PREFIXES.SCHEMES}schema-with-sub-schemas`];

        await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

        return task;
    }

    /**
     * Preview Schema from IPFS
     */
    @Post('/import/message/preview')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Previews the schema from IPFS without loading it into the local DB.',
        description: 'Previews the schema from IPFS without loading it into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: MessageSchemaDTO,
        examples: {
            Message: {
                value: {
                    messageId: Examples.MESSAGE_ID
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(MessageSchemaDTO, SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async importFromMessagePreview(
        @Body() body: MessageSchemaDTO
    ): Promise<SchemaDTO[]> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const guardians = new Guardians();
            return await guardians.previewSchemasByMessages([messageId]);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Preview Schema from IPFS (Async)
     */
    @Post('/push/import/message/preview')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Previews the schema from IPFS without loading it into the local DB.',
        description: 'Previews the schema from IPFS without loading it into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: MessageSchemaDTO,
        examples: {
            Message: {
                value: {
                    messageId: Examples.MESSAGE_ID
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(MessageSchemaDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importFromMessagePreviewAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: MessageSchemaDTO
    ): Promise<TaskDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PREVIEW_SCHEMA_MESSAGE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.previewSchemasByMessagesAsync([messageId], task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Preview Schema from a zip file
     */
    @Post('/import/file/preview')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Previews the schema from a zip file.',
        description: 'Previews the schema from a zip file.' + ONLY_SR,
    })
    @ApiBody({
        description: 'A zip file containing schema to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async importFromFilePreview(
        @Body() zip: any
    ): Promise<SchemaDTO[]> {
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            const { schemas } = await SchemaImportExport.parseZipFile(zip);
            return await guardians.previewSchemasByFile(schemas);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Import Schema from IPFS
     */
    @Post('/:topicId/import/message')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new schema from IPFS into the local DB.',
        description: 'Imports new schema from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: MessageSchemaDTO,
        examples: {
            Message: {
                value: {
                    messageId: Examples.MESSAGE_ID
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(MessageSchemaDTO, SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importFromMessage(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() body: MessageSchemaDTO,
        @Response() res: any
    ): Promise<SchemaDTO[]> {
        const guardians = new Guardians();
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        try {
            const owner = new EntityOwner(user);
            await guardians.importSchemasByMessages([messageId], owner, topicId);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY
            }, owner);
            SchemaHelper.updatePermission(items, owner);
            return res.status(201).header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Import Schema from IPFS (Async)
     */
    @Post('/push/:topicId/import/message')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new schema from IPFS into the local DB.',
        description: 'Imports new schema from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: MessageSchemaDTO,
        examples: {
            Message: {
                value: {
                    messageId: Examples.MESSAGE_ID
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, MessageSchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importFromMessageAsync(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() body: MessageSchemaDTO,
    ): Promise<TaskDTO> {
        const messageId = body?.messageId;
        if (!messageId) {
            throw new HttpException('Message ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_SCHEMA_MESSAGE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.importSchemasByMessagesAsync([messageId], owner, topicId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Import Schema from a zip file
     */
    @Post('/:topicId/import/file')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new schema from a zip file into the local DB.',
        description: 'Imports new schema from a zip file into the local DB.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'A zip file containing schema to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importToTopicFromFile(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() zip: any,
        @Response() res: any
    ): Promise<SchemaDTO[]> {
        const guardians = new Guardians();
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const owner = new EntityOwner(user);
            const files = await SchemaImportExport.parseZipFile(zip);
            await guardians.importSchemasByFile(files, owner, topicId);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY
            }, owner);
            SchemaHelper.updatePermission(items, owner);
            return res.status(201).header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Import Schema from a zip file (Async)
     */
    @Post('/push/:topicId/import/file')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new schema from a zip file into the local DB.',
        description: 'Imports new schema from a zip file into the local DB.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'A zip file containing schema to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importToTopicFromFileAsync(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() zip: any,
    ): Promise<TaskDTO> {
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_SCHEMA_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const files = await SchemaImportExport.parseZipFile(zip);
            const guardians = new Guardians();
            await guardians.importSchemasByFileAsync(files, owner, topicId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });
        return task;
    }

    /**
     * Export schemas
     */
    @Get('/:schemaId/export/message')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns Hedera message IDs of the published schemas.',
        description: 'Returns Hedera message IDs of the published schemas, these messages contain IPFS CIDs of these schema files.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ExportSchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ExportSchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportMessage(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
    ): Promise<ExportSchemaDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const schemas = await guardians.exportSchemas([schemaId], owner);
            const scheme = schemas[0];
            if (!scheme) {
                throw new HttpException(`Cannot export schema ${schemaId}`, HttpStatus.UNPROCESSABLE_ENTITY);
            }
            return {
                id: scheme.id,
                name: scheme.name,
                description: scheme.description,
                version: scheme.version,
                messageId: scheme.messageId,
                owner: scheme.owner
            };
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Export schemas
     */
    @Get('/:schemaId/export/file')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns schema files for the schema.',
        description: 'Returns schema files for the schema.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async exportToFile(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const schemas = await guardians.exportSchemas([schemaId], owner);
            if (!schemas || !schemas.length) {
                throw new HttpException(`Cannot export schema ${schemaId}`, HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const ids = schemas.map(s => s.id);
            const tags = await guardians.exportTags('Schema', ids);
            const name = `${Date.now()}`;
            const zip = await SchemaImportExport.generateZipFile({ schemas, tags });
            const arcStream = zip.generateNodeStream({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 3
                }
            });
            res.header('Content-disposition', `attachment; filename=${name}`);
            res.header('Content-type', 'application/zip');
            return res.send(arcStream);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Create system schema
     */
    @Post('/system/:username')
    @Auth(
        Permissions.SCHEMAS_SYSTEM_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new system schema.',
        description: 'Creates a new system schema.' + ONLY_SR
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'username',
        required: true,
        example: 'username'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async postSystemSchema(
        @AuthUser() user: IAuthUser,
        @Param('username') username: string,
        @Body() body: SystemSchemaDTO,
        @Req() req
    ): Promise<SchemaDTO> {
        try {
            const owner = new EntityOwner(user);
            const newSchema = body as any;

            if (
                newSchema.entity !== SchemaEntity.STANDARD_REGISTRY &&
                newSchema.entity !== SchemaEntity.USER
            ) {
                throw new HttpException(`Invalid schema types. Entity must be ${SchemaEntity.STANDARD_REGISTRY} or ${SchemaEntity.USER}`, HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();

            SchemaUtils.fromOld(newSchema);
            delete newSchema.version;
            delete newSchema.id;
            delete newSchema._id;
            delete newSchema.status;
            delete newSchema.topicId;

            SchemaHelper.updateOwner(newSchema, owner);
            const schema = await guardians.createSystemSchema(newSchema);

            await this.cacheService.invalidate(getCacheKey([req.url], req.user))

            return SchemaUtils.toOld(schema);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get system schemas page
     */
    @Get('/system/:username')
    @Auth(
        Permissions.SCHEMAS_SYSTEM_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all system schemas.',
        description: 'Returns all system schemas.' + ONLY_SR
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'username',
        required: true,
        example: 'username'
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
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getSystemSchema(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('username') username: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const { items, count } = await guardians.getSystemSchemas(pageIndex, pageSize);
            items.forEach((s) => { s.readonly = s.readonly || s.owner !== owner.owner });
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get system schemas page V2 12.06
     */
    @Get('/system/:username')
    @Auth(
        Permissions.SCHEMAS_SYSTEM_SCHEMA_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return a list of all system schemas.',
        description: 'Returns all system schemas.' + ONLY_SR
    })
    @ApiParam({
        name: 'username',
        type: String,
        description: 'username',
        required: true,
        example: 'username'
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
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @Version('2')
    async getSystemSchemaV2(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('username') username: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const fields: string[] = Object.values(SCHEMA_REQUIRED_PROPS)

            const { items, count } = await guardians.getSystemSchemasV2(fields, pageIndex, pageSize);
            items.forEach((s) => { s.readonly = s.readonly || s.owner !== owner.owner });
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Delete system schema
     */
    @Delete('/system/:schemaId')
    @Auth(
        Permissions.SCHEMAS_SYSTEM_SCHEMA_DELETE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Deletes the system schema with the provided schema ID.',
        description: 'Deletes the system schema with the provided schema ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSystemSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const schema = await guardians.getSchemaById(schemaId);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
            }
            const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.SYSTEM);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN);
            }
            if (schema.active) {
                throw new HttpException('Schema is active.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            await guardians.deleteSchema(schemaId, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Update system schema
     */
    @Put('/system/:schemaId')
    @Auth(
        Permissions.SCHEMAS_SYSTEM_SCHEMA_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Updates the system schema.',
        description: 'Updates the system schema.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'Object that contains a valid schema.',
        required: true,
        type: SchemaDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setSystemSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Body() newSchema: SchemaDTO,
        @Req() req
    ): Promise<SchemaDTO[]> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const schema = await guardians.getSchemaById(newSchema.id);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND);
            }
            const error = SchemaUtils.checkPermission(schema, owner, SchemaCategory.SYSTEM);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN);
            }
            if (schema.active) {
                throw new HttpException('Schema is active.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            SchemaUtils.fromOld(newSchema);
            SchemaHelper.checkSchemaKey(newSchema);
            SchemaHelper.updateOwner(newSchema, owner);
            const schemas = await guardians.updateSchema(newSchema, owner);
            SchemaHelper.updatePermission(schemas, owner);

            const invalidedCacheKeys = [`${PREFIXES.SCHEMES}schema-with-sub-schemas`];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return SchemaUtils.toOld(schemas);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Makes the selected scheme active.
     */
    @Put('/system/:schemaId/active')
    @Auth(
        Permissions.SCHEMAS_SYSTEM_SCHEMA_REVIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Makes the selected scheme active. Other schemes of the same type become inactive',
        description: 'Makes the selected scheme active. Other schemes of the same type become inactive' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async activeSystemSchema(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Req() req
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(schemaId);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND);
            }
            if (!schema.system) {
                throw new HttpException('Schema is not system.', HttpStatus.FORBIDDEN);
            }
            if (schema.active) {
                throw new HttpException('Schema is active.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            await guardians.activeSchema(schemaId);

            const invalidedCacheKeys = [`${PREFIXES.SCHEMES}schema-with-sub-schemas`];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return null;
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Finds the schema by entity.
     */
    @Get('/system/entity/:schemaEntity')
    @Auth()
    @ApiOperation({
        summary: 'Finds the schema using the schema type.',
        description: 'Finds the schema using the schema type.',
    })
    @ApiParam({
        name: 'schemaEntity',
        enum: ['STANDARD_REGISTRY', 'USER', 'POLICY', 'MINT_TOKEN', 'WIPE_TOKEN', 'MINT_NFTOKEN'],
        description: 'Entity name',
        required: true,
        example: 'STANDARD_REGISTRY'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSchemaEntity(
        @Param('schemaEntity') schemaEntity: string
    ): Promise<SchemaDTO> {
        try {
            const guardians = new Guardians();
            const schema = await guardians.getSchemaByEntity(schemaEntity);
            if (!schema) {
                return null;
            }
            return {
                uuid: schema.uuid,
                iri: schema.iri,
                name: schema.name,
                version: schema.version,
                document: schema.document,
                documentURL: schema.documentURL,
                context: schema.context,
                contextURL: schema.contextURL,
            };
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Export schemas in a xlsx file.
     */
    @Get('/:schemaId/export/xlsx')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Return schemas in a xlsx file format for the specified policy.',
        description: 'Returns a xlsx file containing schemas.' + ONLY_SR,
    })
    @ApiParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: Examples.DB_ID
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
    @HttpCode(HttpStatus.OK)
    async getPolicyExportXlsx(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            const file: any = await guardians.exportSchemasXlsx(owner, [schemaId]);
            const schema: any = await guardians.getSchemaById(schemaId);
            res.header('Content-disposition', `attachment; filename=${schema.name}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Policy import from a zip file.
     */
    @Post('/:topicId/import/xlsx')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new schema from a xlsx file into the local DB.',
        description: 'Imports new schema from a xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiBody({
        description: 'A xlsx file containing schema config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importPolicyFromXlsx(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() file: ArrayBuffer,
        @Response() res: any
    ): Promise<any> {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            await guardians.importSchemasByXlsx(owner, topicId, file);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY
            }, owner);
            SchemaHelper.updatePermission(items, owner);
            return res.status(201).header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Import Schema from a xlsx file (Async)
     */
    @Post('/push/:topicId/import/xlsx')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Imports new schema from a xlsx file into the local DB.',
        description: 'Imports new schema from a xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
    })
    @ApiBody({
        description: 'A xlsx file containing schema config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async importPolicyFromXlsxAsync(
        @AuthUser() user: IAuthUser,
        @Param('topicId') topicId: string,
        @Body() file: ArrayBuffer,
        @Response() res: any
    ): Promise<any> {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_SCHEMA_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            await guardians.importSchemasByXlsxAsync(owner, topicId, file, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: 'Unknown error: ' + error.message });
        });
        return res.status(202).send(task);
    }

    /**
     * Preview Schema from a xlsx file
     */
    @Post('/import/xlsx/preview')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Previews the schema from a xlsx file.',
        description: 'Previews the schema from a xlsx file.' + ONLY_SR,
    })
    @ApiBody({
        description: 'A xlsx file containing schema config.',
        required: true,
        type: String
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async importPolicyFromXlsxPreview(
        @AuthUser() user: IAuthUser,
        @Body() file: ArrayBuffer
    ) {
        if (!file) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            return await guardians.previewSchemasByFileXlsx(owner, file);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get sub schemas
     */
    @Get('/export/template')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns a list of schemas.',
        description: 'Returns a list of schemas.' + ONLY_SR,
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
    @UseCache({ isExpress: true })
    @HttpCode(HttpStatus.OK)
    async exportTemplate(
        @AuthUser() user: IAuthUser,
        @Response() res: any
    ): Promise<any> {
        try {
            const filename = 'template.xlsx';
            const guardians = new Guardians();
            const file = await guardians.getFileTemplate(filename);
            const fileBuffer = Buffer.from(file, 'base64');
            res.header('Content-disposition', `attachment; filename=` + filename);
            res.header('Content-type', 'application/zip');
            res.locals.data = fileBuffer
            return res.send(fileBuffer);
        } catch (error) {
            await InternalException(error);
        }
    }
}
