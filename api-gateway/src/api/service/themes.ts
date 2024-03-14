import { Logger } from '@guardian/common';
import { Guardians } from '../../helpers/guardians.js';
import { Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Put, Req, Response } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('themes')
@ApiTags('themes')
export class ThemesApi {
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
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
    @HttpCode(HttpStatus.OK)
    async updateTheme(@Req() req, @Response() res): Promise<any> {
        try {
            const user = req.user;
            const newTheme = req.body;
            const guardians = new Guardians();
            if (!req.params.themeId) {
                throw new HttpException('Invalid theme id', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const oldTheme = await guardians.getThemeById(req.params.themeId);
            if (!oldTheme) {
                throw new HttpException('Theme not found.', HttpStatus.NOT_FOUND)
            }
            const theme = await guardians.updateTheme(req.params.themeId, newTheme, user.did);
            return res.json(theme);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/:themeId')
    @HttpCode(HttpStatus.OK)
    async deleteTheme(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            if (!req.params.themeId) {
                throw new HttpException('Invalid theme id', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const result = await guardians.deleteTheme(req.params.themeId, req.user.did);
            return res.json(result);
        } catch (error) {
            await (new Logger()).error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/')
    @HttpCode(HttpStatus.OK)
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
    @HttpCode(HttpStatus.CREATED)
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
    @HttpCode(HttpStatus.OK)
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
