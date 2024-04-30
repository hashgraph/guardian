import { Guardians } from '../../helpers/guardians.js';
import { ISchema, SchemaCategory, SchemaEntity, SchemaHelper, SchemaStatus, StatusType, TaskAction, UserRole } from '@guardian/interfaces';
import { IAuthUser, Logger, RunFunctionAsync, SchemaImportExport } from '@guardian/common';
import { ApiBody, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Req, Response } from '@nestjs/common';
import process from 'process';
import { AuthUser } from '../../auth/authorization-helper.js';
import { Client, ClientProxy, Transport } from '@nestjs/microservices';
import { TaskManager } from '../../helpers/task-manager.js';
import { ServiceError } from '../../helpers/service-requests-base.js';
import { SchemaUtils } from '../../helpers/schema-utils.js';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator.js';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { ExportSchemaDTO, InternalServerErrorDTO, MessageSchemaDTO, SchemaDTO, SystemSchemaDTO, TaskDTO, VersionSchemaDTO } from '../../middlewares/validation/schemas/index.js';
import { Auth } from '../../auth/auth.decorator.js';
import { CACHE } from '../../constants/index.js';
import { UseCache } from '../../helpers/decorators/cache.js';

const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.'

/**
 * Prepare the schema pagination
 *
 * @param req
 * @param user
 */
function prepareSchemaPagination(req: any, user: any, topicId?: string): any {
    const options: any = {};
    options.pageIndex = undefined;
    options.pageSize = undefined;
    if (req.query && req.query.pageIndex && req.query.pageSize) {
        options.pageIndex = req.query.pageIndex;
        options.pageSize = req.query.pageSize;
    }
    if (req.query) {
        options.category = req.query.category;
        if (topicId) {
            options.topicId = topicId;
        } else {
            options.policyId = req.query.policyId;
            options.moduleId = req.query.moduleId;
            options.toolId = req.query.toolId;
            options.topicId = req.query.topicId;
        }
    }
    options.owner = user.parent;
    if (user.role === UserRole.STANDARD_REGISTRY) {
        options.owner = user.did;
    }
    return options;
}

/**
 * Create new schema
 * @param {ISchema} newSchema
 * @param {string} owner
 * @param {string} topicId
 * @returns {Promise<ISchema[]>}
 */
export async function createSchema(newSchema: ISchema, owner: string, topicId?: string): Promise<ISchema[]> {
    const guardians = new Guardians();
    newSchema.topicId = topicId;
    newSchema.category = newSchema.category || SchemaCategory.POLICY;
    SchemaHelper.checkSchemaKey(newSchema);
    SchemaHelper.updateOwner(newSchema, owner);
    const schemas = await guardians.createSchema(newSchema);
    SchemaHelper.updatePermission(schemas, owner);
    return schemas;
}

/**
 * Async create new schema
 * @param {ISchema} newSchema
 * @param {string} owner
 * @param {string} topicId
 * @param {any} task
 */
export async function createSchemaAsync(newSchema: ISchema, owner: string, topicId: string | undefined, task: any): Promise<any> {
    const taskManager = new TaskManager();
    const guardians = new Guardians();
    taskManager.addStatus(task.taskId, 'Check schema version', StatusType.PROCESSING);
    newSchema.topicId = topicId;
    newSchema.category = newSchema.category || SchemaCategory.POLICY;
    SchemaHelper.checkSchemaKey(newSchema);
    SchemaHelper.updateOwner(newSchema, owner);
    await guardians.createSchemaAsync(newSchema, task);
}

/**
 * Copy schema
 * @param iri
 * @param topicId
 * @param name
 * @param owner
 * @param task
 */
export async function copySchemaAsync(iri: string, topicId: string, name: string, owner: string, task: any): Promise<any> {
    const taskManager = new TaskManager();
    const guardians = new Guardians();
    taskManager.addStatus(task.taskId, 'Check schema version', StatusType.PROCESSING);
    await guardians.copySchemaAsync(iri, topicId, name, owner, task);
}

/**
 * Update schema
 * @param {ISchema} newSchema
 * @param {string} owner
 * @returns {Promise<ISchema[]>}
 */
export async function updateSchema(newSchema: ISchema, owner: string): Promise<ISchema[]> {
    const guardians = new Guardians();
    const schema = await guardians.getSchemaById(newSchema.id);
    if (!schema) {
        throw new Error('Schema does not exist.');
    }
    if (schema.creator !== owner) {
        throw new Error('Invalid creator.');
    }

    SchemaHelper.checkSchemaKey(newSchema);
    SchemaHelper.updateOwner(newSchema, owner);
    const schemas = (await guardians.updateSchema(newSchema));
    SchemaHelper.updatePermission(schemas, owner);
    return schemas;
}

@Controller('schema')
@ApiTags('schema')
export class SingleSchemaApi {
    /**
     * use cache 30s test
     * @param req
     */
    @Get('/:schemaId')
    @HttpCode(HttpStatus.OK)
    @UseCache({ ttl: CACHE.SHORT_TTL })
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getSchema(@Req() req): Promise<any> {
        try {
            const user = req.user;
            const schemaId = req.params.schemaId;
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(schemaId);
            if (!schema) {
                throw new HttpException('Schema not found', HttpStatus.NOT_FOUND)
            }
            let owner = user.parent;
            if (user.role === UserRole.STANDARD_REGISTRY) {
                owner = user.did;
            }
            if (!schema.system && schema.owner && schema.owner !== owner) {
                throw new HttpException('Invalid creator.', HttpStatus.FORBIDDEN)

            }
            if (schema.system) {
                schema.readonly = schema.readonly || schema.owner !== owner;
            } else {
                SchemaHelper.updatePermission([schema], owner);
            }
            return SchemaUtils.toOld(schema);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/:schemaId/parents')
    @HttpCode(HttpStatus.OK)
    @ApiExtraModels(SchemaDTO, InternalServerErrorDTO)
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns all parent schemas.',
        description: 'Returns all parent schemas.',
    })
    @ApiImplicitParam({
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getSchemaParents(@Req() req): Promise<any> {
        try {
            const user = req.user;
            const schemaId = req.params.schemaId;
            const guardians = new Guardians();
            const schemas = await guardians.getSchemaParents(schemaId, user?.did);
            return SchemaUtils.toOld(schemas);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/:schemaId/tree')
    @HttpCode(HttpStatus.OK)
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns schema tree.',
        description: 'Returns schema tree.',
    })
    @ApiImplicitParam({
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getSchemaTree(@Req() req): Promise<any> {
        try {
            const user = req.user;
            const schemaId = req.params.schemaId;
            const guardians = new Guardians();
            const tree = await guardians.getSchemaTree(schemaId, user?.did);
            return tree;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }
}

@Controller('schemas')
@ApiTags('schemas')
export class SchemaApi {

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
     * Get page
     */
    @Get('/')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return a list of all schemas.',
        description: 'Returns all schemas.',
    })
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiImplicitQuery({
        name: 'category',
        type: String,
        description: 'Schema category',
        required: false,
        example: SchemaCategory.POLICY
    })
    @ApiImplicitQuery({
        name: 'policyId',
        type: String,
        description: 'Policy id',
        required: false,
        example: '000000000000000000000001'
    })
    @ApiImplicitQuery({
        name: 'moduleId',
        type: String,
        description: 'Module id',
        required: false,
        example: '000000000000000000000001'
    })
    @ApiImplicitQuery({
        name: 'toolId',
        type: String,
        description: 'Tool id',
        required: false,
        example: '000000000000000000000001'
    })
    @ApiImplicitQuery({
        name: 'topicId',
        type: String,
        description: 'Topic id',
        required: false,
        example: '0.0.1'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    'type': 'integer'
                },
                description: 'Total items in the collection.'
            }
        },
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getSchemasPage(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const user = req.user;
            const options: any = prepareSchemaPagination(req, user);
            const { items, count } = await guardians.getSchemasByOwner(options);
            SchemaHelper.updatePermission(items, user.did);
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get page
     */
    @Get('/:topicId')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return a list of all schemas.',
        description: 'Returns all schemas.',
    })
    @ApiImplicitParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
    })
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiImplicitQuery({
        name: 'category',
        type: String,
        description: 'Schema category',
        required: false,
        example: SchemaCategory.POLICY
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    'type': 'integer'
                },
                description: 'Total items in the collection.'
            }
        },
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getSchemasPageByTopicId(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const user = req.user;
            const { topicId } = req.params;
            const options = prepareSchemaPagination(req, user, topicId);
            const { items, count } = await guardians.getSchemasByOwner(options);
            SchemaHelper.updatePermission(items, user.did);
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get schema by type
     */
    @Get('/type/:schemaType')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Finds the schema using the json document type.',
        description: 'Finds the schema using the json document type.',
    })
    @ApiImplicitParam({
        name: 'schemaType',
        type: String,
        description: 'Type',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getSchemaByType(@Req() req, @Response() res): Promise<any> {
        let schema: any;
        try {
            const guardians = new Guardians();
            schema = await guardians.getSchemaByType(req.params.schemaType);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!schema) {
            throw new HttpException(`Schema not found: ${req.params.schemaType}`, HttpStatus.NOT_FOUND);
        }
        try {
            return res.send({
                uuid: schema.uuid,
                iri: schema.iri,
                name: schema.name,
                version: schema.version,
                document: schema.document,
                documentURL: schema.documentURL,
                context: schema.context,
                contextURL: schema.contextURL,
            });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get all schemas
     */
    @Get('/list/all')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns a list of schemas.',
        description: 'Returns a list of schemas.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @UseCache()
    @Auth(UserRole.STANDARD_REGISTRY)
    async getAll(@Req() req): Promise<any> {
        try {
            const user = req.user;
            const guardians = new Guardians();
            if (user.did) {
                return await guardians.getListSchemas(user.did);
            }
            return [];
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get sub schemas
     */
    @Get('/list/sub')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns a list of schemas.',
        description: 'Returns a list of schemas.' + ONLY_SR,
    })
    @ApiImplicitQuery({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: false,
        example: '0.0.1'
    })
    @ApiImplicitQuery({
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @UseCache()
    @Auth(UserRole.STANDARD_REGISTRY)
    async getSub(@Req() req): Promise<any> {
        try {
            const guardians = new Guardians();
            if (!req.user.did) {
                return [];
            }
            return await guardians.getSubSchemas(
                req.query.category,
                req.query.topicId,
                req.user.did
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Create Schema
     */
    @Post('/:topicId')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Creates a new schema.',
        description: 'Creates a new schema.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async createNewSchema(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const newSchema = req.body;
            SchemaUtils.fromOld(newSchema);
            const topicId = req.params.topicId;
            const schemas = await createSchema(
                newSchema,
                user.did,
                topicId,
            );
            return res.status(201).send(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Create Schema (Async)
     */
    @Post('/push/copy')
    @ApiSecurity('bearerAuth')
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @Auth(
        UserRole.STANDARD_REGISTRY,
    )
    @HttpCode(HttpStatus.ACCEPTED)
    async copySchemaAsync(@Body() body: any, @AuthUser() user: any): Promise<any> {
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_SCHEMA, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const { iri, topicId, name } = body;
            await copySchemaAsync(iri, topicId, name, user.did, task);
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
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Creates a new schema.',
        description: 'Creates a new schema.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async createNewSchemaAsync(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const newSchema = req.body;
        const topicId = (req.params.topicId === null || req.params.topicId === undefined) ? undefined : req.params.topicId;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.CREATE_SCHEMA, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            SchemaUtils.fromOld(newSchema);
            await createSchemaAsync(
                newSchema,
                user.did,
                topicId,
                task
            );
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    /**
     * Update Schema
     */
    @Put('/')
    @ApiSecurity('bearerAuth')
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async setSchema(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const newSchema = req.body;
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(newSchema.id);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
            }
            const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN)
            }
            if (schema.status === SchemaStatus.PUBLISHED) {
                throw new HttpException('Schema is published.', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            SchemaUtils.fromOld(newSchema);
            const schemas = await updateSchema(newSchema, user.did);
            return res.send(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Delete Schema
     */
    @Delete('/:schemaId')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Deletes the schema with the provided schema ID.',
        description: 'Deletes the schema with the provided schema ID.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async deleteSchema(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        let schema;
        try {
            schema = await guardians.getSchemaById(schemaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!schema) {
            throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
        }
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
        if (error) {
            throw new HttpException(error, HttpStatus.FORBIDDEN)
        }
        if (schema.status === SchemaStatus.PUBLISHED) {
            throw new HttpException('Schema is published.', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const schemas = (await guardians.deleteSchema(schemaId, user?.did, true) as ISchema[]);
            SchemaHelper.updatePermission(schemas, user.did);
            return res.send(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Publish Schema
     */
    @Put('/:schemaId/publish')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Publishes the schema with the provided schema ID.',
        description: 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
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
        headers: {
            'x-total-count': {
                schema: {
                    'type': 'integer'
                },
                description: 'Total items in the collection.'
            }
        },
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async publishSchema(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const { version } = req.body;
        let schema: ISchema;
        let allVersion: ISchema[];
        try {
            schema = await guardians.getSchemaById(schemaId);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!schema) {
            throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
        }
        try {
            allVersion = await guardians.getSchemasByUUID(schema.uuid);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
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
            await guardians.publishSchema(schemaId, version, user.did);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY,
                owner: user.did
            });
            SchemaHelper.updatePermission(items, user.did);
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Publish Schema (Async)
     */
    @Put('/push/:schemaId/publish')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Publishes the schema with the provided schema ID.',
        description: 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async publishSchemaAsync(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const schemaId = req.params.schemaId;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            throw new HttpException('Schema not found', HttpStatus.NOT_FOUND)
        }
        const notAllowed = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
        if (notAllowed) {
            throw new HttpException(notAllowed, HttpStatus.FORBIDDEN)
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.PUBLISH_SCHEMA, user.id);
        const version = req.body.version;
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
            await guardians.publishSchemaAsync(schemaId, version, user.did, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    /**
     * Preview Schema from IPFS
     */
    @Post('/import/message/preview')
    @ApiSecurity('bearerAuth')
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
                    messageId: '0000000000.000000000'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            'type': 'object'
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async importFromMessagePreview(@Req() req, @Response() res): Promise<any> {
        try {
            const messageId = req.body.messageId;
            const guardians = new Guardians();
            const schemaToPreview = await guardians.previewSchemasByMessages([messageId]);
            return res.send(schemaToPreview);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Preview Schema from IPFS (Async)
     */
    @Post('/push/import/message/preview')
    @ApiSecurity('bearerAuth')
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
                    messageId: '0000000000.000000000'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async importFromMessagePreviewAsync(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new HttpException('Schema ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
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

        return res.status(202).send(task);
    }

    /**
     * Preview Schema from a zip file
     */
    @Post('/import/file/preview')
    @ApiSecurity('bearerAuth')
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
        schema: {
            'type': 'object'
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async importFromFilePreview(@Req() req, @Response() res): Promise<any> {
        const zip = req.body;
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            const { schemas } = await SchemaImportExport.parseZipFile(zip);
            const schemaToPreview = await guardians.previewSchemasByFile(schemas);
            return res.send(schemaToPreview);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import Schema from IPFS
     */
    @Post('/:topicId/import/message')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new schema from IPFS into the local DB.',
        description: 'Imports new schema from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: MessageSchemaDTO,
        examples: {
            Message: {
                value: {
                    messageId: '0000000000.000000000'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    'type': 'integer'
                },
                description: 'Total items in the collection.'
            }
        },
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async importFromMessage(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const topicId = req.params.topicId;
        const guardians = new Guardians();
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new HttpException('message ID in body is required', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            await guardians.importSchemasByMessages([messageId], req.user.did, topicId);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY,
                owner: user.did
            });
            SchemaHelper.updatePermission(items, user.did);
            return res.status(201).header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import Schema from IPFS (Async)
     */
    @Post('/push/:topicId/import/message')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new schema from IPFS into the local DB.',
        description: 'Imports new schema from IPFS into the local DB.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
    })
    @ApiBody({
        description: 'Object that contains version.',
        required: true,
        type: MessageSchemaDTO,
        examples: {
            Message: {
                value: {
                    messageId: '0000000000.000000000'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async importFromMessageAsync(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const topicId = req.params.topicId;
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new HttpException('Schema ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_SCHEMA_MESSAGE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.importSchemasByMessagesAsync([messageId], user.did, topicId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    /**
     * Import Schema from a zip file
     */
    @Post('/:topicId/import/file')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new schema from a zip file into the local DB.',
        description: 'Imports new schema from a zip file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
    })
    @ApiBody({
        description: 'A zip file containing schema to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    'type': 'integer'
                },
                description: 'Total items in the collection.'
            }
        },
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async importToTopicFromFile(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const guardians = new Guardians();
        const zip = req.body;
        const topicId = req.params.topicId;
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const files = await SchemaImportExport.parseZipFile(zip);
            await guardians.importSchemasByFile(files, req.user.did, topicId);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY,
                owner: user.did
            });
            SchemaHelper.updatePermission(items, user.did);
            return res.status(201).header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import Schema from a zip file (Async)
     */
    @Post('/push/:topicId/import/file')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new schema from a zip file into the local DB.',
        description: 'Imports new schema from a zip file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'topicId',
        type: String,
        description: 'Topic Id',
        required: true,
        example: '0.0.1'
    })
    @ApiBody({
        description: 'A zip file containing schema to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async importToTopicFromFileAsync(@Req() req, @Response() res): Promise<any> {
        const user = req.user;
        const zip = req.body;
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const topicId = req.params.topicId;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.IMPORT_SCHEMA_FILE, user.id);
        RunFunctionAsync<ServiceError>(async () => {
            const files = await SchemaImportExport.parseZipFile(zip);
            const guardians = new Guardians();
            await guardians.importSchemasByFileAsync(files, user.did, topicId, task);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(task.taskId, { code: 500, message: error.message });
        });

        return res.status(202).send(task);
    }

    @Get('/:schemaId/export/message')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns Hedera message IDs of the published schemas.',
        description: 'Returns Hedera message IDs of the published schemas, these messages contain IPFS CIDs of these schema files.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ExportSchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async exportMessage(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const id = req.params.schemaId;
            const schemas = await guardians.exportSchemas([id]);
            const scheme = schemas[0];
            if (!scheme) {
                throw new HttpException(`Cannot export schema ${req.params.schemaId}`, HttpStatus.UNPROCESSABLE_ENTITY);
            }
            return res.send({
                id: scheme.id,
                name: scheme.name,
                description: scheme.description,
                version: scheme.version,
                messageId: scheme.messageId,
                owner: scheme.owner
            });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/:schemaId/export/file')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Returns schema files for the schema.',
        description: 'Returns schema files for the schema.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async exportToFile(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const id = req.params.schemaId;
            const schemas = await guardians.exportSchemas([id]);
            if (!schemas || !schemas.length) {
                throw new HttpException(`Cannot export schema ${req.params.schemaId}`, HttpStatus.UNPROCESSABLE_ENTITY)
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
            arcStream.pipe(res);
            return res;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Create system schema
     */
    @Post('/system/:username')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Creates a new system schema.',
        description: 'Creates a new system schema.' + ONLY_SR
    })
    @ApiImplicitParam({
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async postSystemSchema(@Body() body: SystemSchemaDTO, @Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const newSchema = body as any;

            if (newSchema.entity !== SchemaEntity.STANDARD_REGISTRY
                && newSchema.entity !== SchemaEntity.USER) {
                throw new HttpException(`Invalid schema types. Entity must be ${SchemaEntity.STANDARD_REGISTRY} or ${SchemaEntity.USER}`, HttpStatus.UNPROCESSABLE_ENTITY)
            }

            const guardians = new Guardians();
            const owner = user.username;

            SchemaUtils.fromOld(newSchema);
            delete newSchema.version;
            delete newSchema.id;
            delete newSchema._id;
            delete newSchema.status;
            delete newSchema.topicId;

            SchemaHelper.updateOwner(newSchema, owner);
            const schema = await guardians.createSystemSchema(newSchema);

            return res.status(201).send(SchemaUtils.toOld(schema));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Get system schemas page
     */
    @Get('/system/:username')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return a list of all system schemas.',
        description: 'Returns all system schemas.' + ONLY_SR
    })
    @ApiImplicitParam({
        name: 'username',
        type: String,
        description: 'username',
        required: true,
        example: 'username'
    })
    @ApiImplicitQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: {
            'x-total-count': {
                schema: {
                    'type': 'integer'
                },
                description: 'Total items in the collection.'
            }
        },
        type: SchemaDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async getSystemSchema(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const guardians = new Guardians();
            const owner = user.username;
            let pageIndex: any;
            let pageSize: any;
            if (req.query && req.query.pageIndex && req.query.pageSize) {
                pageIndex = req.query.pageIndex;
                pageSize = req.query.pageSize;
            }
            const { items, count } = await guardians.getSystemSchemas(owner, pageIndex, pageSize);
            items.forEach((s) => { s.readonly = s.readonly || s.owner !== owner });
            return res.header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Delete system schema
     */
    @Delete('/system/:schemaId')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Deletes the system schema with the provided schema ID.',
        description: 'Deletes the system schema with the provided schema ID.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @Auth(UserRole.STANDARD_REGISTRY)
    async deleteSystemSchema(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const guardians = new Guardians();
            const schemaId = req.params.schemaId;
            const schema = await guardians.getSchemaById(schemaId);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND)
            }
            const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN);
            }
            if (schema.active) {
                throw new HttpException('Schema is active.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            await guardians.deleteSchema(schemaId, user.username);
            return res.status(204).send();
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Update system schema
     */
    @Put('/system/:schemaId')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Updates the system schema.',
        description: 'Updates the system schema.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async setSystemSchema(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const newSchema = req.body;
            const guardians = new Guardians();
            const schema = await guardians.getSchemaById(newSchema.id);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND);
            }
            const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM);
            if (error) {
                throw new HttpException(error, HttpStatus.FORBIDDEN);
            }
            if (schema.active) {
                throw new HttpException('Schema is active.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            SchemaUtils.fromOld(newSchema);
            const schemas = await updateSchema(newSchema, user.username);
            return res.send(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Makes the selected scheme active.
     */
    @Put('/system/:schemaId/active')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Makes the selected scheme active. Other schemes of the same type become inactive',
        description: 'Makes the selected scheme active. Other schemes of the same type become inactive' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async activeSystemSchema(@Req() req: any): Promise<any> {
        try {
            const guardians = new Guardians();
            const schemaId = req.params.schemaId;
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
            return null;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * Finds the schema by entity.
     */
    @Get('/system/entity/:schemaEntity')
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Finds the schema using the schema type.',
        description: 'Finds the schema using the schema type.',
    })
    @ApiImplicitParam({
        name: 'schemaEntity',
        enum: ['STANDARD_REGISTRY', 'USER', 'POLICY', 'MINT_TOKEN', 'WIPE_TOKEN', 'MINT_NFTOKEN'],
        description: 'Entity name',
        required: true,
        example: 'STANDARD_REGISTRY'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
    async getSchemaEntity(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const schema = await guardians.getSchemaByEntity(req.params.schemaEntity);
            if (!schema) {
                return res.send(null);
            }
            return res.send({
                uuid: schema.uuid,
                iri: schema.iri,
                name: schema.name,
                version: schema.version,
                document: schema.document,
                documentURL: schema.documentURL,
                context: schema.context,
                contextURL: schema.contextURL,
            });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Export schemas in a xlsx file.
     */
    @Get('/:schemaId/export/xlsx')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Return schemas in a xlsx file format for the specified policy.',
        description: 'Returns a xlsx file containing schemas.' + ONLY_SR,
    })
    @ApiImplicitParam({
        name: 'schemaId',
        type: String,
        description: 'Schema ID',
        required: true,
        example: '000000000000000000000001'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getPolicyExportXlsx(
        @AuthUser() user: IAuthUser,
        @Param('schemaId') schemaId: string,
        @Response() res: any
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const file: any = await guardians.exportSchemasXlsx(user, [schemaId]);
            const schema: any = await guardians.getSchemaById(schemaId);
            res.header('Content-disposition', `attachment; filename=${schema.name}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    /**
     * Policy import from a zip file.
     */
    @Post('/:topicId/import/xlsx')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new schema from a xlsx file into the local DB.',
        description: 'Imports new schema from a xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitParam({
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
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
            await guardians.importSchemasByXlsx(user, topicId, file);
            const { items, count } = await guardians.getSchemasByOwner({
                category: SchemaCategory.POLICY,
                owner: user.did
            });
            SchemaHelper.updatePermission(items, user.did);
            return res.status(201).header('X-Total-Count', count).send(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import Schema from a xlsx file (Async)
     */
    @Post('/push/:topicId/import/xlsx')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
    @ApiOperation({
        summary: 'Imports new schema from a xlsx file into the local DB.',
        description: 'Imports new schema from a xlsx file into the local DB.' + ONLY_SR,
    })
    @ApiImplicitParam({
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
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
            await guardians.importSchemasByXlsxAsync(user, topicId, file, task);
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
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
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
            return await guardians.previewSchemasByFileXlsx(user, file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get sub schemas
     */
    @Get('/export/template')
    @Auth(
        UserRole.STANDARD_REGISTRY
    )
    @ApiSecurity('bearerAuth')
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
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    @UseCache({ isExpress: true })
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
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }
}
