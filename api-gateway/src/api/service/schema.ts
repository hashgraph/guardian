import { Guardians } from '@helpers/guardians';
import { Request, Response, Router } from 'express';
import { ISchema, UserRole, SchemaHelper } from '@guardian/interfaces';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';
import JSZip from "jszip";
import { Logger } from '@guardian/logger-helper';
import { PolicyEngine } from '@helpers/policyEngine';

export async function parseZipFile(zipFile: any): Promise<any[]> {
    const zip = new JSZip();
    const content = await zip.loadAsync(zipFile);
    const schemaStringArray = await Promise.all(Object.entries(content.files)
        .filter(file => !file[1].dir)
        .map(file => file[1].async('string')));
    const schemas = schemaStringArray.map(item => JSON.parse(item));
    return schemas;
}

export async function generateZipFile(schemas: ISchema[]): Promise<JSZip> {
    const zip = new JSZip();
    for (let schema of schemas) {
        zip.file(`${schema.iri}.json`, JSON.stringify(schema));
    }
    return zip;
}

export async function createSchema(newSchema: ISchema, owner: string, topicId?: string): Promise<ISchema[]> {
    const guardians = new Guardians();
    if (newSchema.id) {
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            throw new Error('Schema does not exist.');
        }
        if (schema.creator != owner) {
            throw new Error('Invalid creator.');
        }
        newSchema.version = schema.version;
    } else {
        newSchema.version = "";
    }
    delete newSchema.id;
    delete newSchema.status;

    if (topicId) {
        newSchema.topicId = topicId;
    }

    SchemaHelper.updateOwner(newSchema, owner);
    const schemas = (await guardians.createSchema(newSchema));
    SchemaHelper.updatePermission(schemas, owner);
    return schemas;
}

export async function updateSchema(newSchema: ISchema, owner: string): Promise<ISchema[]> {
    const guardians = new Guardians();
    const schema = await guardians.getSchemaById(newSchema.id);
    if (!schema) {
        throw new Error('Schema does not exist.');
    }
    if (schema.creator != owner) {
        throw new Error('Invalid creator.');
    }
    SchemaHelper.updateOwner(newSchema, owner);
    const schemas = (await guardians.updateSchema(newSchema));
    SchemaHelper.updatePermission(schemas, owner);
    return schemas;
}

function toOld<T extends ISchema | ISchema[]>(schemas: T): T {
    if (schemas) {
        if (Array.isArray(schemas)) {
            for (let i = 0; i < schemas.length; i++) {
                const schema: any = schemas[i];
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

function fromOld(schema: any): any {
    if (schema && typeof schema.document == 'string') {
        schema.document = JSON.parse(schema.document);
    }
    if (schema && typeof schema.context == 'string') {
        schema.context = JSON.parse(schema.context);
    }
    return schema;
}

/**
 * Schema route
 */
export const schemaAPI = Router();

/**
 * @deprecated 2022-08-04
 */
schemaAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        fromOld(newSchema);
        const schemas = await createSchema(newSchema, user.did);
        res.status(201).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/:topicId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
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

schemaAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        let pageIndex: any, pageSize: any;
        if (req.query && req.query.pageIndex && req.query.pageSize) {
            pageIndex = req.query.pageIndex;
            pageSize = req.query.pageSize;
        }
        let owner = user.parent;
        if (user.role == UserRole.ROOT_AUTHORITY) {
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
        const { schemas, count } = await guardians.getSchemasByOwner(owner, topicId, pageIndex, pageSize);
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(schemas));
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
        let pageIndex: any, pageSize: any;
        if (req.query && req.query.pageIndex && req.query.pageSize) {
            pageIndex = req.query.pageIndex;
            pageSize = req.query.pageSize;
        }
        let owner = user.parent;
        if (user.role == UserRole.ROOT_AUTHORITY) {
            owner = user.did;
        }
        const { schemas, count } = await guardians.getSchemasByOwner(owner, topicId, pageIndex, pageSize);
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

schemaAPI.put('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator != user.did) {
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

schemaAPI.delete('/:schemaId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator != user.did) {
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

schemaAPI.put('/:schemaId/publish', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid creator.' });
            return;
        }
        if (schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is system.' });
            return;
        }

        const allVersion = await guardians.getSchemasByUUID(schema.uuid);
        const { version } = req.body;
        if (allVersion.findIndex(s => s.version == version) !== -1) {
            res.status(500).json({ code: 500, message: 'Version already exists.' });
        }

        const item = await guardians.publishSchema(schemaId, version, user.did);

        const { schemas, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

/**
 * @deprecated 2022-08-04
 */
schemaAPI.post('/import/message', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const messageId = req.body.messageId as string;
        const map = await guardians.importSchemasByMessages([messageId], req.user.did, null);
        const { schemas, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

/**
 * @deprecated 2022-08-04
 */
schemaAPI.post('/import/file', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const zip = req.body;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const files = await parseZipFile(zip);
        const map = await guardians.importSchemasByFile(files, req.user.did, null);
        const { schemas, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/import/message/preview', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const messageId = req.body.messageId;
        if (!messageId) {
            throw new Error('Schema ID in body is empty');
        }
        const user = req.user;
        const guardians = new Guardians();
        const schemaToPreview = await guardians.previewSchemasByMessages([messageId]);
        res.status(200).json(schemaToPreview);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/import/file/preview', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const zip = req.body;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const user = req.user;
        const guardians = new Guardians();
        const files = await parseZipFile(zip);
        const schemaToPreview = await guardians.previewSchemasByFile(files);
        res.status(200).json(schemaToPreview);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/:topicId/import/message', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const topicId = req.params.topicId as string;
        const guardians = new Guardians();
        const messageId = req.body.messageId as string;
        const map = await guardians.importSchemasByMessages([messageId], req.user.did, topicId);
        const { schemas, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(201).setHeader('X-Total-Count', count).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/:topicId/import/file', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const zip = req.body;
        const topicId = req.params.topicId as string;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const files = await parseZipFile(zip);
        const map = await guardians.importSchemasByFile(files, req.user.did, topicId);
        const { schemas, count } = await guardians.getSchemasByOwner(user.did);
        SchemaHelper.updatePermission(schemas, user.did);
        res.status(201).setHeader('X-Total-Count', count).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/:schemaId/export/message', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        if (!req.params.schemaId) {
            throw new Error("No schemas to export");
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

schemaAPI.get('/:schemaId/export/file', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.params.schemaId) {
            throw new Error("No schemas to export");
        }
        const guardians = new Guardians();
        const id = req.params.schemaId as string;
        const schemas = await guardians.exportSchemas([id]);
        const name = `${Date.now()}`;
        const zip = await generateZipFile(schemas);
        const arcStream = zip.generateNodeStream();
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

schemaAPI.post('/system/:username', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const guardians = new Guardians();
        const owner = user.username;

        fromOld(newSchema);
        delete newSchema.version;
        delete newSchema.id;
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

schemaAPI.get('/system/:username', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const owner = user.username;
        let pageIndex: any, pageSize: any;
        if (req.query && req.query.pageIndex && req.query.pageSize) {
            pageIndex = req.query.pageIndex;
            pageSize = req.query.pageSize;
        }
        const { schemas, count } = await guardians.getSystemSchemas(owner, pageIndex, pageSize);
        schemas.forEach((s) => {s.readonly = s.readonly || s.owner != owner});
        res.status(200).setHeader('X-Total-Count', count).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

schemaAPI.delete('/system/:schemaId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.username) {
            res.status(500).json({ code: 500, message: 'Invalid creator.' });
            return;
        }
        if (schema.active) {
            res.status(500).json({ code: 500, message: 'Schema is active.' });
            return;
        }
        if (!schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is not system.' });
            return;
        }
        await guardians.deleteSchema(schemaId);
        res.status(200).json(null);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/system', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const guardians = new Guardians();
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.username) {
            res.status(500).json({ code: 500, message: 'Invalid creator.' });
            return;
        }
        if (schema.active) {
            res.status(500).json({ code: 500, message: 'Schema is active.' });
            return;
        }
        if (!schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is not system.' });
            return;
        }
        fromOld(newSchema);
        const schemas = await updateSchema(newSchema, user.did);
        res.status(200).json(toOld(schemas));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/system/:schemaId/active', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.active) {
            res.status(500).json({ code: 500, message: 'Schema is active.' });
            return;
        }
        if (!schema.system) {
            res.status(500).json({ code: 500, message: 'Schema is not system.' });
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
            throw new Error(`Schema not found: ${req.params.schemaEntity}`);
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