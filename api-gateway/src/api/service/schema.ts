import { Guardians } from '@helpers/guardians';
import { Request, Response, Router } from 'express';
import { ISchema, UserRole, SchemaHelper, SchemaEntity, StatusType } from '@guardian/interfaces';
import { permissionHelper } from '@auth/authorization-helper';
import JSZip from 'jszip';
import { AuthenticatedRequest, Logger, RunFunctionAsync } from '@guardian/common';
import { PolicyEngine } from '@helpers/policy-engine';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';

/**
 * Parse zip archive
 * @param {any} zipFile
 * @returns {Promise<any[]>}
 */
export async function parseZipFile(zipFile: any): Promise<any[]> {
    const zip = new JSZip();
    const content = await zip.loadAsync(zipFile);
    const schemaStringArray = await Promise.all(Object.entries(content.files)
        .filter(file => !file[1].dir)
        .map(file => file[1].async('string')));
    const schemas = schemaStringArray.map(item => JSON.parse(item));
    return schemas;
}

/**
 * Generate zip archive
 * @param {ISchema[]} schemas
 * @returns {@Promise<JSZip>>}
 */
export async function generateZipFile(schemas: ISchema[]): Promise<JSZip> {
    const zip = new JSZip();
    for (const schema of schemas) {
        zip.file(`${schema.iri}.json`, JSON.stringify(schema));
    }
    return zip;
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
 * Convert schemas to old format
 * @param {ISchema | ISchema[]} schemas
 * @returns {ISchema | ISchema[]}
 */
function toOld<T extends ISchema | ISchema[]>(schemas: T): T {
    if (schemas) {
        if (Array.isArray(schemas)) {
            for (const schema of schemas) {
                if (schema.document) {
                    schema.document = JSON.stringify(schema.document);
                }
                if (schema.context) {
                    schema.context = JSON.stringify(schema.context);
                }
            }
            return schemas;
        } else {
            const schema: any = schemas;
            if (schema.document) {
                schema.document = JSON.stringify(schema.document);
            }
            if (schema.context) {
                schema.context = JSON.stringify(schema.context);
            }
            return schema;
        }
    }
    return schemas;
}

/**
 * Convert schema from old format
 * @param {ISchema} schema
 * @returns {ISchema}
 */
function fromOld(schema: ISchema): ISchema {
    if (schema && typeof schema.document === 'string') {
        schema.document = JSON.parse(schema.document);
    }
    if (schema && typeof schema.context === 'string') {
        schema.context = JSON.parse(schema.context);
    }
    return schema;
}

/**
 * Single schema route
 */
export const singleSchemaRoute = Router();

singleSchemaRoute.get('/:schemaId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const schemaId = req.params.schemaId as string;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(schemaId);
        let owner = user.parent;
        if (user.role === UserRole.STANDARD_REGISTRY) {
            owner = user.did;
        }
        if (!schema) {
            throw new Error('Schema not found');
        }
        if (!schema.system && schema.owner && schema.owner !== owner) {
            throw new Error('Insufficient permissions to read schema');
        }
        if (schema.system) {
            schema.readonly = schema.readonly || schema.owner !== owner;
        }
        else {
            SchemaHelper.updatePermission([schema], owner);
        }
        res.status(200).json(toOld(schema));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

/**
 * Schema route
 */
export const schemaAPI = Router();

schemaAPI.post('/:topicId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        fromOld(newSchema);
        const topicId = req.params.topicId as string;
        const schemas = await createSchema(newSchema, user.did, topicId);
        res.status(201).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/push/:topicId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Create schema');

    const user = req.user;
    const newSchema = req.body;
    const topicId = req.params.topicId as string;
    RunFunctionAsync<ServiceError>(async () => {
        fromOld(newSchema);
        await createSchemaAsync(newSchema, user.did, topicId, taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(201).send({ taskId, expectation });
});

schemaAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
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
        let topicId = null;
        const policyId = req.query?.policyId;
        if (policyId) {
            const engineService = new PolicyEngine();
            const model = (await engineService.getPolicy({
                filters: policyId,
                userDid: user.did,
            })) as any;
            topicId = model?.topicId;
        }
        const { items, count } = await guardians.getSchemasByOwner(owner, topicId, pageIndex, pageSize);
        SchemaHelper.updatePermission(items, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

schemaAPI.get('/:topicId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const topicId = req.params.topicId as string;
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
        const { items, count } = await guardians.getSchemasByOwner(owner, topicId, pageIndex, pageSize);
        SchemaHelper.updatePermission(items, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

schemaAPI.put('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator !== user.did) {
            res.status(500).json({ code: 500, message: 'Invalid creator.' });
            return;
        }
        if (schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is system.' });
            return;
        }
        fromOld(newSchema);
        const schemas = await updateSchema(newSchema, user.did)
        res.status(200).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.delete('/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator !== user.did) {
            res.status(500).json({ code: 500, message: 'Invalid creator.' });
            return;
        }
        if (schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is system.' });
            return;
        }
        const schemas = (await guardians.deleteSchema(schemaId));
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(200).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/:schemaId/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator !== user.did) {
            res.status(500).json({ code: 500, message: 'Invalid creator.' });
            return;
        }
        if (schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is system.' });
            return;
        }

        const allVersion = await guardians.getSchemasByUUID(schema.uuid);
        const { version } = req.body;
        if (allVersion.findIndex(s => s.version === version) !== -1) {
            res.status(500).json({ code: 500, message: 'Version already exists.' });
        }

        await guardians.publishSchema(schemaId, version, user.did);

        const { items, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(items, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/push/:schemaId/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Publish schema');

    const schemaId = req.params.schemaId;
    const user = req.user;
    const version = req.body.version;
    RunFunctionAsync<ServiceError>(async () => {
        const guardians = new Guardians();
        taskManager.addStatus(taskId, 'Load schema data', StatusType.PROCESSING);
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            taskManager.addError(taskId, { code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator !== user.did) {
            taskManager.addError(taskId, { code: 500, message: 'Invalid creator.' });
            return;
        }
        if (schema.system) {
            taskManager.addError(taskId, { code: 500, message: 'Schema is system.' });
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

    res.status(200).send({ taskId, expectation });
});

schemaAPI.post('/import/message/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new Error('Schema ID in body is empty');
        }
        const guardians = new Guardians();
        const schemaToPreview = await guardians.previewSchemasByMessages([messageId]);
        res.status(200).json(schemaToPreview);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/push/import/message/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
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

    res.status(201).send({ taskId, expectation });
});

schemaAPI.post('/import/file/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const zip = req.body;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const guardians = new Guardians();
        const files = await parseZipFile(zip);
        const schemaToPreview = await guardians.previewSchemasByFile(files);
        res.status(200).json(schemaToPreview);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/:topicId/import/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const topicId = req.params.topicId as string;
        const guardians = new Guardians();
        const messageId = req.body.messageId as string;
        await guardians.importSchemasByMessages([messageId], req.user.did, topicId);
        const { items, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(items, user.did);
        res.status(201).setHeader('X-Total-Count', count).json(toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/push/:topicId/import/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Import schema message');

    const user = req.user;
    const topicId = req.params.topicId as string;
    const messageId = req.body.messageId as string;
    RunFunctionAsync<ServiceError>(async () => {
        const guardians = new Guardians();
        await guardians.importSchemasByMessagesAsync([messageId], user.did, topicId, taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(201).send({ taskId, expectation });
});

schemaAPI.post('/:topicId/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const zip = req.body;
        const topicId = req.params.topicId as string;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const files = await parseZipFile(zip);
        await guardians.importSchemasByFile(files, req.user.did, topicId);
        const { items, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(items, user.did);
        res.status(201).setHeader('X-Total-Count', count).json(toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/push/:topicId/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    const taskManager = new TaskManager();
    const { taskId, expectation } = taskManager.start('Import schema file');

    const user = req.user;
    const zip = req.body;
    const topicId = req.params.topicId as string;
    RunFunctionAsync<ServiceError>(async () => {
        taskManager.addStatus(taskId, 'Parse file', StatusType.PROCESSING);
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const files = await parseZipFile(zip);
        taskManager.addStatus(taskId, 'Parse file', StatusType.COMPLETED);
        const guardians = new Guardians();
        await guardians.importSchemasByFileAsync(files, user.did, topicId, taskId);
    }, async (error) => {
        new Logger().error(error, ['API_GATEWAY']);
        taskManager.addError(taskId, { code: 500, message: error.message });
    });

    res.status(201).send({ taskId, expectation });
});

schemaAPI.get('/:schemaId/export/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: Request, res: Response) => {
    try {
        if (!req.params.schemaId) {
            throw new Error('No schemas to export');
        }
        const guardians = new Guardians();
        const id = req.params.schemaId as string;
        const schemas = await guardians.exportSchemas([id]);
        const scheme = schemas[0];
        if (!scheme) {
            throw new Error(`Cannot export policy ${req.params.schemaId}`);
        }
        res.status(200).send({
            id: scheme.id,
            name: scheme.name,
            description: scheme.description,
            version: scheme.version,
            messageId: scheme.messageId,
            owner: scheme.owner
        });
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/:schemaId/export/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.params.schemaId) {
            throw new Error('No schemas to export');
        }
        const guardians = new Guardians();
        const id = req.params.schemaId as string;
        const schemas = await guardians.exportSchemas([id]);
        const name = `${Date.now()}`;
        const zip = await generateZipFile(schemas);
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
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/type/:schemaType', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.params.schemaType) {
            throw new Error(`Schema not found: ${req.params.schemaType}`);
        }
        const guardians = new Guardians();
        const schema = await guardians.getSchemaByType(req.params.schemaType);
        if (!schema) {
            throw new Error(`Schema not found: ${req.params.schemaType}`);
        }
        res.status(200).send({
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
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/system/:username', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;

        if (!newSchema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (newSchema.entity !== SchemaEntity.STANDARD_REGISTRY && newSchema.entity !== SchemaEntity.USER) {
            res.status(500).json({
                code: 500,
                message: `Invalid schema types. Entity must be ${SchemaEntity.STANDARD_REGISTRY} or ${SchemaEntity.USER}`
            });
            return;
        }

        const guardians = new Guardians();
        const owner = user.username;

        fromOld(newSchema);
        delete newSchema.version;
        delete newSchema.id;
        delete newSchema._id;
        delete newSchema.status;
        delete newSchema.topicId;

        SchemaHelper.updateOwner(newSchema, owner);
        const schema = await guardians.createSystemSchema(newSchema);

        res.status(201).json(toOld(schema));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/system/:username', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
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
        res.status(200).setHeader('X-Total-Count', count).json(toOld(items));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

schemaAPI.delete('/system/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.system) {
            if (schema.owner !== user.username) {
                res.status(500).json({ code: 500, message: 'Invalid creator.' });
                return;
            }
            if (schema.active) {
                res.status(500).json({ code: 500, message: 'Schema is active.' });
                return;
            }
        } else {
            if (schema.owner !== user.did) {
                res.status(500).json({ code: 500, message: 'Invalid creator.' });
                return;
            } else {
                res.status(500).json({ code: 500, message: 'Schema is not system.' });
                return;
            }
        }
        await guardians.deleteSchema(schemaId);
        res.status(200).json(null);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/system/:schemaId', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.system) {
            if (schema.owner !== user.username) {
                res.status(500).json({ code: 500, message: 'Invalid creator.' });
                return;
            }
            if (schema.active) {
                res.status(500).json({ code: 500, message: 'Schema is active.' });
                return;
            }
        } else {
            if (schema.owner !== user.did) {
                res.status(500).json({ code: 500, message: 'Invalid creator.' });
                return;
            } else {
                res.status(500).json({ code: 500, message: 'Schema is not system.' });
                return;
            }
        }
        fromOld(newSchema);
        const schemas = await updateSchema(newSchema, user.username);
        res.status(200).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/system/:schemaId/active', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (!schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is not system.' });
            return;
        }
        if (schema.active) {
            res.status(500).json({ code: 500, message: 'Schema is active.' });
            return;
        }
        await guardians.activeSchema(schemaId);
        res.status(200).json(null);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/system/entity/:schemaEntity', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.params.schemaEntity) {
            throw new Error(`Schema not found: ${req.params.schemaEntity}`);
        }
        const guardians = new Guardians();
        const schema = await guardians.getSchemaByEntity(req.params.schemaEntity);
        if (!schema) {
            res.status(200).send(null);
            return;
        }
        res.status(200).send({
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
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/list/all', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemas = await guardians.getListSchemas(user.did);
        res.status(200).send(schemas);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});