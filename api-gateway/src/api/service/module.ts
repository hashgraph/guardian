import { permissionHelper } from '@auth/authorization-helper';
import { Response, Router, NextFunction } from 'express';
import { UserRole } from '@guardian/interfaces';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import createError from 'http-errors';

/**
 * Module route
 */
export const moduleAPI = Router();

moduleAPI.post('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        const module = req.body;
        if (!module.config || module.config.blockType !== 'module') {
            return next(createError(422, 'Invalid module config'));
        }
        const item = await guardian.createModule(module, req.user.did);
        res.status(201).json(item);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.get('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();

        let pageIndex: any;
        let pageSize: any;
        if (req.query && req.query.pageIndex && req.query.pageSize) {
            pageIndex = req.query.pageIndex;
            pageSize = req.query.pageSize;
        }
        const { items, count } = await guardians.getModule({
            owner: req.user.did,
            pageIndex,
            pageSize
        });
        res.setHeader('X-Total-Count', count).json(items);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.delete('/:uuid', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        if (!req.params.uuid) {
            return next(createError(422, 'Invalid uuid'));
        }
        const result = await guardian.deleteModule(req.params.uuid, req.user.did);
        res.status(200).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.get('/menu', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const items = await guardians.getMenuModule(req.user.did);
        res.json(items);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.get('/:uuid', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        if (!req.params.uuid) {
            return next(createError(422, 'Invalid uuid'));
        }
        const item = await guardian.getModuleById(req.params.uuid, req.user.did);
        res.json(item);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.put('/:uuid', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardian = new Guardians();
        if (!req.params.uuid) {
            return next(createError(422, 'Invalid uuid'));
        }
        const module = req.body;
        if (!module.config || module.config.blockType !== 'module') {
            return next(createError(422, 'Invalid module config'));
        }
        const result = await guardian.updateModule(req.params.uuid, module, req.user.did);
        res.status(201).json(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.get('/:uuid/export/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const file: any = await guardian.exportModuleFile(req.params.uuid, req.user.did);
        res.setHeader('Content-disposition', `attachment; filename=module_${Date.now()}`);
        res.setHeader('Content-type', 'application/zip');
        res.send(file);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.get('/:uuid/export/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        res.send(await guardian.exportModuleMessage(req.params.uuid, req.user.did));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.post('/import/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const module = await guardian.importModuleMessage(req.body.messageId, req.user.did);
        res.status(201).send(module);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.post('/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const module = await guardian.importModuleFile(req.body, req.user.did);
        res.status(201).send(module);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.post('/import/message/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const module = await guardian.previewModuleMessage(req.body.messageId, req.user.did);
        res.send(module);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.post('/import/file/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const module = await guardian.previewModuleFile(req.body, req.user.did);
        res.send(module);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.put('/:uuid/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const module = await guardian.publishModule(req.params.uuid, req.user.did, req.body);
        res.json(module);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

moduleAPI.post('/validate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        res.send(await guardian.validateModule(req.user.did, req.body));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});
