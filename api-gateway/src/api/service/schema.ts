import { Guardians } from '@helpers/guardians';
import { Request, Response, Router } from 'express';
import { ISchema, SchemaHelper, UserRole } from 'interfaces';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';
import JSZip from "jszip";
import { Logger } from 'logger-helper';

export async function parseZipFile(zipFile: any): Promise<any[]> {
    const zip = new JSZip();
    const content = await zip.loadAsync(zipFile);
    const schemaStringArray = await Promise.all(Object.entries(content.files)
        .filter(file => !file[1].dir)
        .map(file => file[1].async('string')));
    const schemes = schemaStringArray.map(item => JSON.parse(item));
    return schemes;
}

export async function generateZipFile(schemes: ISchema[]): Promise<JSZip> {
    const zip = new JSZip();
    for (let schema of schemes) {
        zip.file(`${schema.iri}.json`, JSON.stringify(schema));
    }
    return zip;
}

export async function createSchema(newSchema: ISchema, owner: string, policyId?: string): Promise<ISchema[]> {
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
    newSchema.policyId = policyId || null;

    delete newSchema.id;
    delete newSchema.status;

    SchemaHelper.updateOwner(newSchema, owner);
    const schemes = (await guardians.createSchema(newSchema));
    SchemaHelper.updatePermission(schemes, owner);
    return schemes;
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
    const schemes = (await guardians.updateSchema(newSchema));
    SchemaHelper.updatePermission(schemes, owner);
    return schemes;
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
        const schemes = await createSchema(newSchema, user.did);
        res.status(201).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/:policyId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const policyId = req.params.policyId as string;
        const schemes = await createSchema(newSchema, user.did, policyId);
        res.status(201).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const { schemes, count } = await guardians.getSchemesByOwner(user.did, null, pageIndex, pageSize);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

schemaAPI.get('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const policyId = req.params.policyId as string;
        const guardians = new Guardians();
        let pageIndex: any, pageSize: any;
        if (req.query && req.query.pageIndex && req.query.pageSize) {
            pageIndex = req.query.pageIndex;
            pageSize = req.query.pageSize;
        }
        const { schemes, count } = await guardians.getSchemesByOwner(user.did, policyId, pageIndex, pageSize);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

schemaAPI.put('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const newSchema = req.body;
        const schemes = await updateSchema(newSchema, user.did)
        res.status(200).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const schemes = (await guardians.deleteSchema(schemaId));
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const allVersion = await guardians.getSchemesByUUID(schema.uuid);
        const { version } = req.body;
        if (allVersion.findIndex(s => s.version == version) !== -1) {
            res.status(500).json({ code: 500, message: 'Version already exists.' });
        }

        const item = await guardians.publishSchema(schemaId, version, user.did);

        const { schemes, count } = await guardians.getSchemesByOwner(user.did);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const map = await guardians.importSchemesByMessages([messageId], req.user.did);
        const { schemes, count } = await guardians.getSchemesByOwner(user.did);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const map = await guardians.importSchemesByFile(files, req.user.did);
        const { schemes, count } = await guardians.getSchemesByOwner(user.did);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const schemaToPreview = await guardians.previewSchemesByMessages([messageId]);
        res.status(200).json(schemaToPreview);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const schemaToPreview = await guardians.previewSchemesByFile(files);
        res.status(200).json(schemaToPreview);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/:policyId/import/message', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const messageId = req.body.messageId as string;
        const map = await guardians.importSchemesByMessages([messageId], req.user.did);
        const { schemes, count } = await guardians.getSchemesByOwner(user.did);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/:policyId/import/file', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const zip = req.body;
        if (!zip) {
            throw new Error('file in body is empty');
        }
        const files = await parseZipFile(zip);
        const map = await guardians.importSchemesByFile(files, req.user.did);
        const { schemes, count } = await guardians.getSchemesByOwner(user.did);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).setHeader('X-Total-Count', count).json(schemes);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const schemes = await guardians.exportSchemes([id]);
        const scheme = schemes[0];
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
        new Logger().error(error.message, ['API_GATEWAY']);
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
        const schemes = await guardians.exportSchemes([id]);
        const name = `${Date.now()}`;
        const zip = await generateZipFile(schemes);
        const arcStream = zip.generateNodeStream();
        res.setHeader('Content-disposition', `attachment; filename=${name}`);
        res.setHeader('Content-type', 'application/zip');
        arcStream.pipe(res);
    } catch (error) {
        new Logger().error(error.message, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});
