import { Guardians } from '../../helpers/guardians.js';
import { AboutInterface, CommonSettings, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { SettingsDTO } from '../../middlewares/validation/schemas/settings.js';
import process from 'process';
import { Auth } from '../../auth/auth.decorator.js';

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
    @Auth(UserRole.STANDARD_REGISTRY)
    async updateSettings(@Body() body: SettingsDTO, @Req() req, @Response() res): Promise<any> {
        try {
            const settings = body as CommonSettings;
            const guardians = new Guardians();
            await Promise.all([
                guardians.updateSettings(settings)
            ]);
            return res.status(201).send(null);
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
    @Auth(UserRole.STANDARD_REGISTRY)
    async getSettings(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const [guardiansSettings] = await Promise.all([
                guardians.getSettings()
            ]);
            res.send({
                ...guardiansSettings
            });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Get('/environment')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY, UserRole.AUDITOR, UserRole.USER)
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

    @Get('/about')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async getAbout(@Req() req): Promise<AboutInterface> {
        return {
            version: process.env.npm_package_version
        }
    }
}
