import { permissionHelper } from '@auth/authorization-helper';
import { Router, NextFunction } from 'express';
import { UserRole } from '@guardian/interfaces';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import createError from 'http-errors';
import { Controller, Delete, Get, Post, Put, Req, Response } from '@nestjs/common';

@Controller('modules')
export class ModulesApi {
    @Post('/')
    async postModules(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            const module = req.body;
            if (!module.config || module.config.blockType !== 'module') {
                throw new Error('Invalid module config');
            }
            const item = await guardian.createModule(module, req.user.did);
            return res.status(201).json(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/')
    async getModules(@Req() req, @Response() res): Promise<any> {
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
            return res.setHeader('X-Total-Count', count).json(items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Delete('/:uuid')
    async deleteModule(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new Error('Invalid uuid')
            }
            const result = await guardian.deleteModule(req.params.uuid, req.user.did);
            return res.status(200).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/menu')
    async getMenu(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const items = await guardians.getMenuModule(req.user.did);
            return res.json(items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:uuid')
    async getModule(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new Error('Invalid uuid')
                // return next(createError(422, ));
            }
            const item = await guardian.getModuleById(req.params.uuid, req.user.did);
            return res.json(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/:uuid')
    async putModule(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new Error('Invalid uuid')
                // return next(createError(422, 'Invalid uuid'));
            }
            const module = req.body;
            if (!module.config || module.config.blockType !== 'module') {
                throw new Error('Invalid module config')
                // return next(createError(422, 'Invalid module config'));
            }
            const result = await guardian.updateModule(req.params.uuid, module, req.user.did);
            return res.status(201).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
            // return next(error);
        }
    }

    @Get('/:uuid/export/file')
    async moduleExportFile(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const file: any = await guardian.exportModuleFile(req.params.uuid, req.user.did);
            res.setHeader('Content-disposition', `attachment; filename=module_${Date.now()}`);
            res.setHeader('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/:uuid/export/message')
    async moduleExportMessage(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            return res.send(await guardian.exportModuleMessage(req.params.uuid, req.user.did));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/import/message')
    async moduleImportMessage(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.importModuleMessage(req.body.messageId, req.user.did);
            return res.status(201).send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/import/file')
    async moduleImportFile(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.importModuleFile(req.body, req.user.did);
            return res.status(201).send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Post('/import/message/preview')
    async moduleImportMessagePreview(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.previewModuleMessage(req.body.messageId, req.user.did);
            return res.send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/import/file/preview')
    async moduleImportFilePreview(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.previewModuleFile(req.body, req.user.did);
            return res.send(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Put('/:uuid/publish')
    async publishModule(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const module = await guardian.publishModule(req.params.uuid, req.user.did, req.body);
            return res.json(module);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/validate')
    async validateModule(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            return res.send(await guardian.validateModule(req.user.did, req.body));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

}

/**
 * Module route
 */
// export const moduleAPI = Router();

// moduleAPI.post('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const guardian = new Guardians();
//         const module = req.body;
//         if (!module.config || module.config.blockType !== 'module') {
//             return next(createError(422, 'Invalid module config'));
//         }
//         const item = await guardian.createModule(module, req.user.did);
//         res.status(201).json(item);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.get('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const guardians = new Guardians();
//
//         let pageIndex: any;
//         let pageSize: any;
//         if (req.query && req.query.pageIndex && req.query.pageSize) {
//             pageIndex = req.query.pageIndex;
//             pageSize = req.query.pageSize;
//         }
//         const { items, count } = await guardians.getModule({
//             owner: req.user.did,
//             pageIndex,
//             pageSize
//         });
//         res.setHeader('X-Total-Count', count).json(items);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.delete('/:uuid', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const guardian = new Guardians();
//         if (!req.params.uuid) {
//             return next(createError(422, 'Invalid uuid'));
//         }
//         const result = await guardian.deleteModule(req.params.uuid, req.user.did);
//         res.status(200).json(result);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.get('/menu', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const guardians = new Guardians();
//         const items = await guardians.getMenuModule(req.user.did);
//         res.json(items);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.get('/:uuid', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const guardian = new Guardians();
//         if (!req.params.uuid) {
//             return next(createError(422, 'Invalid uuid'));
//         }
//         const item = await guardian.getModuleById(req.params.uuid, req.user.did);
//         res.json(item);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.put('/:uuid', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const guardian = new Guardians();
//         if (!req.params.uuid) {
//             return next(createError(422, 'Invalid uuid'));
//         }
//         const module = req.body;
//         if (!module.config || module.config.blockType !== 'module') {
//             return next(createError(422, 'Invalid module config'));
//         }
//         const result = await guardian.updateModule(req.params.uuid, module, req.user.did);
//         res.status(201).json(result);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.get('/:uuid/export/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         const file: any = await guardian.exportModuleFile(req.params.uuid, req.user.did);
//         res.setHeader('Content-disposition', `attachment; filename=module_${Date.now()}`);
//         res.setHeader('Content-type', 'application/zip');
//         res.send(file);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.get('/:uuid/export/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         res.send(await guardian.exportModuleMessage(req.params.uuid, req.user.did));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.post('/import/message', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         const module = await guardian.importModuleMessage(req.body.messageId, req.user.did);
//         res.status(201).send(module);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.post('/import/file', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         const module = await guardian.importModuleFile(req.body, req.user.did);
//         res.status(201).send(module);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.post('/import/message/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         const module = await guardian.previewModuleMessage(req.body.messageId, req.user.did);
//         res.send(module);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.post('/import/file/preview', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         const module = await guardian.previewModuleFile(req.body, req.user.did);
//         res.send(module);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.put('/:uuid/publish', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         const module = await guardian.publishModule(req.params.uuid, req.user.did, req.body);
//         res.json(module);
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });

// moduleAPI.post('/validate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const guardian = new Guardians();
//     try {
//         res.send(await guardian.validateModule(req.user.did, req.body));
//     } catch (error) {
//         new Logger().error(error, ['API_GATEWAY']);
//         return next(error);
//     }
// });
