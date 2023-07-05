import { Guardians } from '@helpers/guardians';
import { CommonSettings, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { prepareValidationResponse } from '@middlewares/validation';
import { Controller, Get, HttpCode, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';

@Controller('settings')
export class SettingsApi {
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async updateSettings(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const settings = req.body as CommonSettings;
            if (!settings || Object.keys(settings).length === 0) {
                return res.status(422).json(prepareValidationResponse('Invalid settings'));
            }
            const guardians = new Guardians();
            await Promise.all([
                guardians.updateSettings(settings)
            ]);
            return res.status(201).json(null);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }

    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getSettings(@Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const guardians = new Guardians();
            const [guardiansSettings] = await Promise.all([
                guardians.getSettings()
            ]);
            res.json({
                ...guardiansSettings
            });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/environment')
    @HttpCode(HttpStatus.OK)
    async getEnvironment(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const environment = await guardians.getEnvironment();
            return res.send(environment);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
