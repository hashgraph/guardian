import { Guardians } from '@helpers/guardians';
import { ISchema, SchemaCategory, SchemaEntity, SchemaHelper, SchemaStatus, StatusType, UserRole } from '@guardian/interfaces';
import { Logger, RunFunctionAsync } from '@guardian/common';
import { PolicyEngine } from '@helpers/policy-engine';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { SchemaUtils } from '@helpers/schema-utils';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { Client, ClientProxy, Transport } from '@nestjs/microservices';
import process from 'process';
import { ApiTags } from '@nestjs/swagger';
import { SystemSchemaDTO } from '@middlewares/validation/schemas/schemas';

/**
 * Prepare new schema object
 * @param newSchema
 * @param guardians
 * @param owner
 */
async function prepareSchema(newSchema, guardians: Guardians, owner: string) {
    if (newSchema.id) {
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            throw new Error('Schema does not exist.');
        }
        if (schema.creator !== owner) {
            throw new Error('Invalid creator.');
        }
        newSchema.version = schema.version;
    } else {
        newSchema.version = '';
    }
    delete newSchema._id;
    delete newSchema.id;
    delete newSchema.status;
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
    await prepareSchema(newSchema, guardians, owner);

    if (topicId) {
        newSchema.topicId = topicId;
    }

    SchemaHelper.checkSchemaKey(newSchema);
    SchemaHelper.updateOwner(newSchema, owner);
    const schemas = (await guardians.createSchema(newSchema));
    SchemaHelper.updatePermission(schemas, owner);
    return schemas;
}

/**
 * Async create new schema
 * @param {ISchema} newSchema
 * @param {string} owner
 * @param {string} topicId
 * @param {string} taskId
 */
export async function createSchemaAsync(newSchema: ISchema, owner: string, topicId: string, taskId: string): Promise<any> {
    const taskManager = new TaskManager();
    const guardians = new Guardians();

    taskManager.addStatus(taskId, 'Check schema version', StatusType.PROCESSING);
    await prepareSchema(newSchema, guardians, owner);
    taskManager.addStatus(taskId, 'Check schema version', StatusType.COMPLETED);

    newSchema.topicId = topicId;

    SchemaHelper.checkSchemaKey(newSchema);
    SchemaHelper.updateOwner(newSchema, owner);
    await guardians.createSchemaAsync(newSchema, taskId);
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
@ApiTags('schemas')
export class SingleSchemaApi {
    @Get('/:schemaId')
    @HttpCode(HttpStatus.OK)
    async getSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)(req.user);
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
            return res.json(SchemaUtils.toOld(schema));
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

    @Post('/:topicId')
    @HttpCode(HttpStatus.CREATED)
    async setTopicId(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            return res.status(201).json(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/push/:topicId')
    @HttpCode(HttpStatus.ACCEPTED)
    async setTopicIdAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Create schema');

        const user = req.user;
        const newSchema = req.body;
        const topicId = req.params.topicId;
        RunFunctionAsync<ServiceError>(async () => {
            SchemaUtils.fromOld(newSchema);
            await createSchemaAsync(
                newSchema,
                user.did,
                topicId,
                taskId,
            );
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getSchemas(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)(req.user);
        try {
            const user = req.user;
            const { guardians, pageIndex, pageSize, owner } = prepareSchemaPagination(req, user);
            let topicId = null;
            const policyId = req.query?.policyId;
            if (policyId) {
                const engineService = new PolicyEngine();
                const model = (await engineService.getPolicy({
                    filters: policyId,
                    userDid: user.did,
                }));
                topicId = model?.topicId;
            }

            const { items, count } = await guardians.getSchemasByOwner(owner, topicId, pageIndex, pageSize);
            // const result = await this.client.send(MessageAPI.GET_SCHEMAS, {
            //     owner,
            //     topicId,
            //     pageIndex,
            //     pageSize
            // }).toPromise();
            // const { items, count } = result.body;
            SchemaHelper.updatePermission(items, user.did);
            return res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:topicId')
    @HttpCode(HttpStatus.OK)
    async getByTopicId(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER, UserRole.AUDITOR)(req.user);
        try {
            const user = req.user;
            const { topicId } = req.params;
            const { guardians, pageIndex, pageSize, owner } = prepareSchemaPagination(req, user);
            const { items, count } = await guardians.getSchemasByOwner(owner, topicId, pageIndex, pageSize);
            SchemaHelper.updatePermission(items, user.did);
            return res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('/')
    @HttpCode(HttpStatus.OK)
    async setSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            return res.json(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/:schemaId')
    @HttpCode(HttpStatus.OK)
    async deleteSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            const schemas = (await guardians.deleteSchema(schemaId, true) as ISchema[]);
            SchemaHelper.updatePermission(schemas, user.did);
            return res.json(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('/:schemaId/publish')
    @HttpCode(HttpStatus.OK)
    async publishSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const {version} = req.body;
        let schema;
        let allVersion;
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

            const {items, count} = await guardians.getSchemasByOwner(user.did);
            SchemaHelper.updatePermission(items, user.did);
            return res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('/push/:schemaId/publish')
    @HttpCode(HttpStatus.ACCEPTED)
    async publishSchemaAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Publish schema');

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
        const version = req.body.version;
        RunFunctionAsync<ServiceError>(async () => {
            taskManager.addStatus(taskId, 'Load schema data', StatusType.PROCESSING);
            if (schema.status === SchemaStatus.PUBLISHED) {
                taskManager.addError(taskId, { code: 500, message: 'Schema is published.' });
                return;
            }
            const allVersion = await guardians.getSchemasByUUID(schema.uuid);
            if (allVersion.findIndex(s => s.version === version) !== -1) {
                taskManager.addError(taskId, { code: 500, message: 'Version already exists.' });
                return;
            }
            taskManager.addStatus(taskId, 'Load schema data', StatusType.COMPLETED);
            await guardians.publishSchemaAsync(schemaId, version, user.did, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Post('/import/message/preview')
    @HttpCode(HttpStatus.OK)
    async importFromMessagePreview(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const messageId = req.body.messageId;
            const guardians = new Guardians();
            const schemaToPreview = await guardians.previewSchemasByMessages([messageId]);
            return res.json(schemaToPreview);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/push/import/message/preview')
    @HttpCode(HttpStatus.ACCEPTED)
    async importFromMessagePreviewAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const {taskId, expectation} = taskManager.start('Preview schema message');

        const messageId = req.body.messageId;
        if (!messageId) {
            throw new HttpException('Schema ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.previewSchemasByMessagesAsync([messageId], taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, {code: 500, message: error.message});
        });

        return res.status(202).send({taskId, expectation});
    }

    @Post('/import/file/preview')
    @HttpCode(HttpStatus.OK)
    async importFromFilePreview(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const zip = req.body;
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const guardians = new Guardians();
            const {schemas} = await SchemaUtils.parseZipFile(zip);
            const schemaToPreview = await guardians.previewSchemasByFile(schemas);
            return res.json(schemaToPreview);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/:topicId/import/message')
    @HttpCode(HttpStatus.CREATED)
    async importFromMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const topicId = req.params.topicId;
        const guardians = new Guardians();
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new HttpException('message ID in body is required', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            await guardians.importSchemasByMessages([messageId], req.user.did, topicId);
            const {items, count} = await guardians.getSchemasByOwner(user.did);
            SchemaHelper.updatePermission(items, user.did);
            return res.status(201).setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/push/:topicId/import/message')
    @HttpCode(HttpStatus.ACCEPTED)
    async importFromMessageAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const {taskId, expectation} = taskManager.start('Import schema message');

        const user = req.user;
        const topicId = req.params.topicId;
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new HttpException('Schema ID in body is empty', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.importSchemasByMessagesAsync([messageId], user.did, topicId, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, {code: 500, message: error.message});
        });

        return res.status(202).send({taskId, expectation});
    }

    @Post('/:topicId/import/file')
    @HttpCode(HttpStatus.CREATED)
    async importToTopicFromFile(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const user = req.user;
        const guardians = new Guardians();
        const zip = req.body;
        const topicId = req.params.topicId;
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        try {
            const files = await SchemaUtils.parseZipFile(zip);
            await guardians.importSchemasByFile(files, req.user.did, topicId);
            const {items, count} = await guardians.getSchemasByOwner(user.did);
            SchemaHelper.updatePermission(items, user.did);
            return res.status(201).setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/push/:topicId/import/file')
    @HttpCode(HttpStatus.ACCEPTED)
    async importToTopicFromFileAsync(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Import schema file');

        const user = req.user;
        const zip = req.body;
        if (!zip) {
            throw new HttpException('File in body is empty', HttpStatus.UNPROCESSABLE_ENTITY)
        }
        const topicId = req.params.topicId;
        RunFunctionAsync<ServiceError>(async () => {
            taskManager.addStatus(taskId, 'Parse file', StatusType.PROCESSING);
            const files = await SchemaUtils.parseZipFile(zip);
            taskManager.addStatus(taskId, 'Parse file', StatusType.COMPLETED);
            const guardians = new Guardians();
            await guardians.importSchemasByFileAsync(files, user.did, topicId, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Get('/:schemaId/export/message')
    @HttpCode(HttpStatus.OK)
    async exportMessage(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
    @HttpCode(HttpStatus.OK)
    async exportToFile(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            const zip = await SchemaUtils.generateZipFile(schemas, tags);
            const arcStream = zip.generateNodeStream({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 3
                }
            });
            res.setHeader('Content-disposition', `attachment; filename=${name}`);
            res.setHeader('Content-type', 'application/zip');
            arcStream.pipe(res);
            return res;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/type/:schemaType')
    @HttpCode(HttpStatus.OK)
    async getSchemaType(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER, UserRole.AUDITOR)(req.user)
        let schema;
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

    @Post('/system/:username')
    @HttpCode(HttpStatus.CREATED)
    async postSystemSchema(@Body() body: SystemSchemaDTO, @Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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

            return res.status(201).json(SchemaUtils.toOld(schema));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/system/:username')
    @HttpCode(HttpStatus.OK)
    async getSystemSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            return res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/system/:schemaId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSystemSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            await guardians.deleteSchema(schemaId);
            return res.status(204).send();
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/system/:schemaId')
    @HttpCode(HttpStatus.OK)
    async setSystemSchema(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
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
            return res.json(SchemaUtils.toOld(schemas));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/system/:schemaId/active')
    @HttpCode(HttpStatus.OK)
    async activeSystemSchema(@Req() req: any): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const schemaId = req.params.schemaId;
            const schema = await guardians.getSchemaById(schemaId);
            if (!schema) {
                throw new HttpException('Schema not found.', HttpStatus.NOT_FOUND);
            }
            if (!schema.system) {
                throw new HttpException('Schema not found.', HttpStatus.FORBIDDEN);
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

    @Get('/system/entity/:schemaEntity')
    @HttpCode(HttpStatus.OK)
    async getSchemaEntity(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER, UserRole.AUDITOR)(req.user)
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

    @Get('/list/all')
    @HttpCode(HttpStatus.OK)
    async getAll(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const user = req.user;
            const guardians = new Guardians();
            if (user.did) {
                const schemas = await guardians.getListSchemas(user.did);
                return res.send(schemas);
            }
            res.send([]);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}

/**
 * Prepare the schema pagination
 *
 * @param req
 * @param user
 */
function prepareSchemaPagination(req, user) {
    const guardians = new Guardians();
    let pageIndex: any;
    let pageSize: any;
    if (req.query && req.query.pageIndex && req.query.pageSize) {
        pageIndex = req.query.pageIndex;
        pageSize = req.query.pageSize;
    }
    let owner = user.parent;
    if (user.role === UserRole.STANDARD_REGISTRY) {
        owner = user.did;
    }
    return { guardians, pageIndex, pageSize, owner };
}
