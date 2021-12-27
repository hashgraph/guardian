import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Request, Response, Router } from 'express';
import { UserRole } from 'interfaces';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';

/**
 * Schema route
 */
export const schemaAPI = Router();

schemaAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const newSchema = req.body;
        const schemes = (await guardians.setSchema(newSchema));
        res.status(201).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const schemes = (await guardians.getSchemes());
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const newSchema = req.body;
        const schemes = (await guardians.setSchema(newSchema));
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/:schemaId/publish', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schemes = (await guardians.publishSchema(schemaId));
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/:schemaId/unpublished', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schemes = (await guardians.unpublishedSchema(schemaId));
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.delete('/:schemaId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schemes = (await guardians.deleteSchema(schemaId));
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.post('/import', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const newSchemes = req.body.schemes;
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
        const ids = req.body.ids as string[];
        const schemes = (await guardians.exportSchemes(ids));
        const json = schemes;
        res.status(200).json({ schemes: json });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

