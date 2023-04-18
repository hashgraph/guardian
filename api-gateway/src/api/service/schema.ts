import { Guardians } from '@helpers/guardians';
import { NextFunction, Request, Response, Router } from 'express';
import {
    ISchema,
    SchemaCategory,
    SchemaEntity,
    SchemaHelper,
    SchemaStatus,
    StatusType,
    UserRole
} from '@guardian/interfaces';
import { permissionHelper } from '@auth/authorization-helper';
import { AuthenticatedRequest, Logger, RunFunctionAsync } from '@guardian/common';
import { PolicyEngine } from '@helpers/policy-engine';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { SchemaUtils } from '@helpers/schema-utils';
import createError from 'http-errors';
import validate from '@middlewares/validation';
import { schemaSchema, systemEntitySchema } from '@middlewares/validation/schemas/schemas';

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

/**
 * Single schema route
 */
export const singleSchemaRoute = Router();

singleSchemaRoute.get('/:schemaId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const schemaId = req.params.schemaId;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            return next(createError(404, 'Schema not found'));
        }
        let owner = user.parent;
        if (user.role === UserRole.STANDARD_REGISTRY) {
            owner = user.did;
        }
        if (!schema.system && schema.owner && schema.owner !== owner) {
            return next(createError(403, 'Invalid creator.'));
        }
        if (schema.system) {
            schema.readonly = schema.readonly || schema.owner !== owner;
        } else {
            SchemaHelper.updatePermission([schema], owner);
        }
        res.json(SchemaUtils.toOld(schema));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

/**
 * Schema route
 */
export const schemaAPI = Router();

schemaAPI.post('/:topicId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        SchemaUtils.fromOld(newSchema);
        const topicId = req.params.topicId;
        const schemas = await createSchema(newSchema, user.did, topicId);
        return res.status(201).json(SchemaUtils.toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.post('/push/:topicId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Create schema');

    const user = req.user;
    const newSchema = req.body;
    const topicId = req.params.topicId;
    RunFunctionAsync<ServiceError>(async () => {
        SchemaUtils.fromOld(newSchema);
        await createSchemaAsync(newSchema, user.did, topicId, taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(202).send({ taskId, expectation });
});

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

schemaAPI.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        SchemaHelper.updatePermission(items, user.did);
        res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.get('/:topicId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { topicId } = req.params;
        const { guardians, pageIndex, pageSize, owner } = prepareSchemaPagination(req, user);
        const { items, count } = await guardians.getSchemasByOwner(owner, topicId, pageIndex, pageSize);
        SchemaHelper.updatePermission(items, user.did);
        res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.put('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            return next(createError(404, 'Schema not found.'));
        }
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
        if (error) {
            return next(createError(403, error));
        }
        if (schema.status === SchemaStatus.PUBLISHED) {
            return next(createError(422, 'Schema is published.'));
        }
        SchemaUtils.fromOld(newSchema);
        const schemas = await updateSchema(newSchema, user.did);
        res.json(SchemaUtils.toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.delete('/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            return next(createError(404, 'Schema not found.'));
        }
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
        if (error) {
            return next(createError(403, error));
        }
        if (schema.status === SchemaStatus.PUBLISHED) {
            return next(createError(422, 'Schema is published.'));
        }
        const schemas = (await guardians.deleteSchema(schemaId, true) as ISchema[]);
        SchemaHelper.updatePermission(schemas, user.did);
        res.json(SchemaUtils.toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.put('/:schemaId/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            return next(createError(404, 'Schema not found.'));
        }
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
        if (error) {
            return next(createError(403, error));
        }
        if (schema.status === SchemaStatus.PUBLISHED) {
            return next(createError(422, 'Schema is published.'));
        }
        const allVersion = await guardians.getSchemasByUUID(schema.uuid);
        const { version } = req.body;
        if (allVersion.findIndex(s => s.version === version) !== -1) {
            return next(createError(422, 'Version already exists.'));
        }

        await guardians.publishSchema(schemaId, version, user.did);

        const { items, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(items, user.did);
        res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.put('/push/:schemaId/publish', permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Publish schema');

    const user = req.user;
    const schemaId = req.params.schemaId;
    const guardians = new Guardians();
    const schema = await guardians.getSchemaById(schemaId);
    if (!schema) {
        return next(createError(404, 'Schema not found'));
    }
    const notAllowed = SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
    if (notAllowed) {
        return next(createError(403, notAllowed));
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
        }
        taskManager.addStatus(taskId, 'Load schema data', StatusType.COMPLETED);
        await guardians.publishSchemaAsync(schemaId, version, user.did, taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(202).send({ taskId, expectation });
});

schemaAPI.post('/import/message/preview', [
  validate(schemaSchema()), permissionHelper(UserRole.STANDARD_REGISTRY)
], async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const messageId = req.body.messageId;
        const guardians = new Guardians();
        const schemaToPreview = await guardians.previewSchemasByMessages([messageId]);
        return res.json(schemaToPreview);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.post('/push/import/message/preview', [
  validate(schemaSchema()), permissionHelper(UserRole.STANDARD_REGISTRY)
], async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Preview schema message');

    const messageId = req.body.messageId;
    RunFunctionAsync<ServiceError>(async () => {
        if (!messageId) {
            throw new Error('Schema ID in body is empty');
        }
        const guardians = new Guardians();
        await guardians.previewSchemasByMessagesAsync([messageId], taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(202).send({ taskId, expectation });
});

schemaAPI.post('/import/file/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const zip = req.body;
        if (!zip) {
            return next(createError(422, 'File in body is empty'));
        }
        const guardians = new Guardians();
        const { schemas } = await SchemaUtils.parseZipFile(zip);
        const schemaToPreview = await guardians.previewSchemasByFile(schemas);
        res.json(schemaToPreview);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.post('/:topicId/import/message',
  [
      validate(schemaSchema()),
      permissionHelper(UserRole.STANDARD_REGISTRY)
  ]
  , async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const topicId = req.params.topicId;
        const guardians = new Guardians();
        const messageId = req.body.messageId;
        await guardians.importSchemasByMessages([messageId], req.user.did, topicId);
        const { items, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(items, user.did);
        res.status(201).setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.post('/push/:topicId/import/message', [
    validate(schemaSchema()),
    permissionHelper(UserRole.STANDARD_REGISTRY)
], async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Import schema message');

    const user = req.user;
    const topicId = req.params.topicId;
    const messageId = req.body.messageId;
    RunFunctionAsync<ServiceError>(async () => {
        const guardians = new Guardians();
        await guardians.importSchemasByMessagesAsync([messageId], user.did, topicId, taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(202).send({ taskId, expectation });
});

schemaAPI.post('/:topicId/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const zip = req.body;
        const topicId = req.params.topicId;
        if (!zip) {
            return next(createError(422, 'File in body is empty'));
        }
        const files = await SchemaUtils.parseZipFile(zip);
        await guardians.importSchemasByFile(files, req.user.did, topicId);
        const { items, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(items, user.did);
        res.status(201).setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.post('/push/:topicId/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Import schema file');

    const user = req.user;
    const zip = req.body;
    if (!zip) {
        return next(createError(422, 'File in body is empty'));
    }
    const topicId = req.params.topicId;
    RunFunctionAsync<ServiceError>(async ()  => {
        taskManager.addStatus(taskId, 'Parse file', StatusType.PROCESSING);
        const files = await SchemaUtils.parseZipFile(zip);
        taskManager.addStatus(taskId, 'Parse file', StatusType.COMPLETED);
        const guardians = new Guardians();
        await guardians.importSchemasByFileAsync(files, user.did, topicId, taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(202).send({ taskId, expectation });
});

schemaAPI.get('/:schemaId/export/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const id = req.params.schemaId;
        const schemas = await guardians.exportSchemas([id]);
        const scheme = schemas[0];
        if (!scheme) {
            return next(createError(422, `Cannot export policy ${req.params.schemaId}`));
        }
        res.send({
            id: scheme.id,
            name: scheme.name,
            description: scheme.description,
            version: scheme.version,
            messageId: scheme.messageId,
            owner: scheme.owner
        });
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.get('/:schemaId/export/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const id = req.params.schemaId;
        const schemas = await guardians.exportSchemas([id]);
        if (!schemas || !schemas.length) {
            return next(createError(422, `Cannot export policy ${req.params.schemaId}`));
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
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.get('/type/:schemaType', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const schema = await guardians.getSchemaByType(req.params.schemaType);
        if (!schema) {
            return next(createError(404, `Schema not found: ${req.params.schemaType}`));
        }
        res.send({
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
        return next(error);
    }
});

schemaAPI.post('/system/:username', [
  validate(systemEntitySchema()),
  permissionHelper(UserRole.STANDARD_REGISTRY)
], async (
  req: AuthenticatedRequest, res: Response, next: NextFunction
) => {
    try {
        const user = req.user;
        const newSchema = req.body;

        if (newSchema.entity !== SchemaEntity.STANDARD_REGISTRY
          && newSchema.entity !== SchemaEntity.USER) {
            return next(createError(422,
              `Invalid schema types. Entity must be ${SchemaEntity.STANDARD_REGISTRY} or ${SchemaEntity.USER}`
            ));
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

        res.status(201).json(SchemaUtils.toOld(schema));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.get('/system/:username', permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        res.setHeader('X-Total-Count', count).json(SchemaUtils.toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.delete('/system/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            return next(createError(404, 'Schema not found.'));
        }
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM);
        if (error) {
            return next(createError(403, error))
        }
        if (schema.active) {
            return next(createError(422, 'Schema is active.'));
        }
        await guardians.deleteSchema(schemaId);
        res.status(204).send();
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.put('/system/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            return next(createError(404, 'Schema not found.'));
        }
        const error = SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM);
        if (error) {
            return next(createError(403, error))
        }
        if (schema.active) {
            return next(createError(422, 'Schema is active.'));
        }
        SchemaUtils.fromOld(newSchema);
        const schemas = await updateSchema(newSchema, user.username);
        res.json(SchemaUtils.toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.put('/system/:schemaId/active', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            return next(createError(404, 'Schema not found.'));
        }
        if (!schema.system) {
            return next(createError(403, 'Schema is not system.'));
        }
        if (schema.active) {
            return next(createError(422, 'Schema is active.'));
        }
        await guardians.activeSchema(schemaId);
        return res.json(null);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

schemaAPI.get('/system/entity/:schemaEntity', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        return next(error);
    }
});

schemaAPI.get('/list/all', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        return next(error);
    }
});
