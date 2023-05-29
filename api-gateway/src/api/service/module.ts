import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, Req, Response } from '@nestjs/common';

@Controller('modules')
export class ModulesApi {
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async postModules(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            const module = req.body;
            if (!module.config || module.config.blockType !== 'module') {
                throw new HttpException('Invalid module config', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const item = await guardian.createModule(module, req.user.did);
            return res.status(201).json(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/')
    @HttpCode(HttpStatus.OK)
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
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete('/:uuid')
    @HttpCode(HttpStatus.OK)
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
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/menu')
    @HttpCode(HttpStatus.OK)
    async getMenu(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const items = await guardians.getMenuModule(req.user.did);
            return res.json(items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/:uuid')
    @HttpCode(HttpStatus.OK)
    async getModule(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const item = await guardian.getModuleById(req.params.uuid, req.user.did);
            return res.json(item);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/:uuid')
    @HttpCode(HttpStatus.CREATED)
    async putModule(@Req() req, @Response() res): Promise<any> {
        try {
            const guardian = new Guardians();
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const module = req.body;
            if (!module.config || module.config.blockType !== 'module') {
                throw new HttpException('Invalid module config', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const result = await guardian.updateModule(req.params.uuid, module, req.user.did);
            return res.status(201).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:uuid/export/file')
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.CREATED)
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
    @HttpCode(HttpStatus.CREATED)
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
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.OK)
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
