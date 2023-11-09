import { Guardians } from '@helpers/guardians';
import { AboutInterface, CommonSettings, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { checkPermission } from '@auth/authorization-helper';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas/errors';
import { SettingsDTO } from '@middlewares/validation/schemas/settings';
import process from 'process';

@Controller('settings')
@ApiTags('settings')
export class SettingsApi {
    @ApiOperation({
        summary: 'Set settings.',
        description: 'Set settings. For users with the Standard Registry role only.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/')
    @HttpCode(HttpStatus.CREATED)
    async updateSettings(@Body() body: SettingsDTO, @Req() req, @Response() res): Promise<any> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
        try {
            const settings = body as CommonSettings;
            const guardians = new Guardians();
            await Promise.all([
                guardians.updateSettings(settings)
            ]);
            return res.status(201).json(null);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiOperation({
        summary: 'Returns current settings.',
        description: 'Returns current settings. For users with the Standard Registry role only.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
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
        await checkPermission(UserRole.STANDARD_REGISTRY, UserRole.USER, UserRole.AUDITOR)(req.user);
        try {
            const guardians = new Guardians();
            const environment = await guardians.getEnvironment();
            return res.send(environment);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/about')
    @HttpCode(HttpStatus.OK)
    async getAbout(@Req() req): Promise<AboutInterface> {
        await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);

        return {
            version: process.env.npm_package_version
        }
    }
}
