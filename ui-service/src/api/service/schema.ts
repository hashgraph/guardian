import { Guardians } from '@helpers/guardians';
import { Request, Response, Router } from 'express';
import { ISchema, ISchemaSubmitMessage, ModelActionType, Schema, SchemaHelper, UserRole } from 'interfaces';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';
import { Blob } from 'buffer';
import { IPFS } from '@helpers/ipfs';
import { HederaHelper } from 'vc-modules';
import { schemasToContext } from '@transmute/jsonld-schema';

/**
 * Schema route
 */
export const schemaAPI = Router();

schemaAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const newSchema = req.body;
        if (newSchema.id) {
            const schema = await guardians.getSchemaById(newSchema.id);
            if (!schema) {
                res.status(500).json({ code: 500, message: 'Schema does not exist.' });
                return;
            }
            if (schema.creator != user.did) {
                res.status(500).json({ code: 500, message: 'Invalid creator.' });
                return;
            }
            newSchema.version = schema.version;
            delete newSchema.id;
            delete newSchema.status;
        } else {
            newSchema.version = "";
            delete newSchema.id;
            delete newSchema.status;
        }
        SchemaHelper.updateOwner(newSchema, user.did);
        const schemes = (await guardians.setSchema(newSchema));
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(201).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemes = await guardians.getSchemesByOwner(user.did);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const newSchema = req.body;
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.creator != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid creator.' });
            return;
        }
        SchemaHelper.updateOwner(newSchema, user.did);
        const schemes = (await guardians.setSchema(newSchema));
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).json(schemes);
    } catch (error) {
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

        const schemes = await guardians.getSchemesByOwner(user.did);
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/:schemaId/unpublish', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
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
        const schemes = (await guardians.unpublishedSchema(schemaId));
        SchemaHelper.updatePermission(schemes, user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

// schemaAPI.post('/import', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
//     try {
//         const guardians = new Guardians();
//         const newSchemes = req.body.schemes;
//         newSchemes.forEach((s: ISchema) => {
//             delete s.owner;
//             delete s.id;
//             delete s.status;
//         });
//         await guardians.importSchemes(newSchemes);
//         const schemes = (await guardians.getSchemes(null));
//         res.status(201).json(schemes);
//     } catch (error) {
//         res.status(500).json({ code: 500, message: error.message });
//     }
// });

schemaAPI.post('/import/topic', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const messageId = req.body.messageId;
        const schemaToPreview = await guardians.loadSchema(messageId, req.user.did);

        if (!schemaToPreview) {
            throw new Error('Cannot load schema');
        }

        res.status(201).json(schemaToPreview);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/import/preview/:messageId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const messageId = req.params.messageId;
        const schemaToPreview = await guardians.getSchemaPreview(messageId);
        res.status(200).json(schemaToPreview);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/export', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        if (!req.body?.ids || req.body.ids.length === 0) {
            throw new Error("No schemas to export");
        }

        const guardians = new Guardians();
        const ids = req.body.ids as string[];
        const schemes = (await guardians.exportSchemes(ids));
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});
