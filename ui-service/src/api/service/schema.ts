import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Request, Response, Router } from 'express';
import { ISchema, Schema, UserRole } from 'interfaces';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';

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
            const schema = await guardians.getSchema(newSchema.id);
            if (!schema) {
                res.status(500).json({ code: 500, message: 'Schema does not exist.' });
                return;
            }
            if (schema.owner != user.did) {
                res.status(500).json({ code: 500, message: 'Invalid owner.' });
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
        Schema.updateOwner(newSchema, user.did);
        const schemes = (await guardians.setSchema(newSchema));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
        res.status(201).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemes = (await guardians.getSchemes({ owner: user.did }));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
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
        const schema = await guardians.getSchema(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        Schema.updateOwner(newSchema, user.did);
        const schemes = (await guardians.setSchema(newSchema));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
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
        const schema = await guardians.getSchema(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        const allVersion = (await guardians.getSchemes({ uuid: schema.uuid }));
        const { version } = req.body;
        if (allVersion.findIndex(s => s.version == version) !== -1) {
            res.status(500).json({ code: 500, message: 'Version already exists.' });
        }
        Schema.updateVersion(schema, version);
        (await guardians.setSchema(schema));
        const schemes = (await guardians.publishSchema(schemaId));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
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
        const schema = await guardians.getSchema(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        const schemes = (await guardians.unpublishedSchema(schemaId));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
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
        const schema = await guardians.getSchema(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        const schemes = (await guardians.deleteSchema(schemaId));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/import', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const newSchemes = req.body.schemes;
        newSchemes.forEach((s: ISchema) => {
            delete s.owner;
            delete s.id;
            delete s.status;
        });
        await guardians.importSchemes(newSchemes);
        const schemes = (await guardians.getSchemes(null));
        res.status(201).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/export', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const refs = req.body.refs as string[];
        const schemes = (await guardians.exportSchemes(refs));
        schemes.forEach((s: ISchema) => {
            delete s.id;
            delete s.status;
        });
        const json = schemes;
        res.status(200).json({ schemes: json });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});
