import { Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { Controller, Delete, Get, Post, Put, Req, Response } from '@nestjs/common';

@Controller('themes')
export class ThemesApi {
    @Post('/')
    async setThemes(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const item = await guardians.createTheme(req.body, req.user.did);
            return res.status(201).json(item);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/:themeId')
    async updateTheme(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const newTheme = req.body;
            const guardians = new Guardians();
            if (!req.params.themeId) {
                throw new Error('Invalid theme id')
                // return next(createError(422, 'Invalid theme id'));
            }
            const oldTheme = await guardians.getThemeById(req.params.themeId);
            if (!oldTheme) {
                throw new Error('Theme not found.')
                // return next(createError(404, 'Theme not found.'));
            }
            const theme = await guardians.updateTheme(req.params.themeId, newTheme, user.did);
            return res.json(theme);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/:themeId')
    async deleteTheme(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            if (!req.params.themeId) {
                throw new Error('Invalid theme id')

                // return next(createError(422, 'Invalid theme id'));
            }
            const result = await guardians.deleteTheme(req.params.themeId, req.user.did);
            return res.json(result);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/')
    async getThemes(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const guardians = new Guardians();
            if (user.did) {
                const themes = await guardians.getThemes(user.did);
                return res.send(themes);
            }
            return res.send([]);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Post('/import/file')
    async importTheme(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const theme = await guardian.importThemeFile(req.body, req.user.did);
            return res.status(201).send(theme);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/:themeId/export/file')
    async exportTheme(@Req() req, @Response() res): Promise<any> {
        const guardian = new Guardians();
        try {
            const file: any = await guardian.exportThemeFile(req.params.themeId, req.user.did);
            res.setHeader('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.setHeader('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
