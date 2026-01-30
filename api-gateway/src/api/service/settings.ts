import { AboutInterface, CommonSettings, Permissions } from '@guardian/interfaces';
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsDTO, InternalServerErrorDTO } from '#middlewares';
import { Auth, AuthUser } from '#auth';
import { Guardians, InternalException } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import fs from 'node:fs';

@Controller('settings')
@ApiTags('settings')
export class SettingsApi {
    private cachedVersion?: string;

    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Set settings
     */
    @Post('/')
    @Auth(
        Permissions.SETTINGS_SETTINGS_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Set settings.',
        description: 'Set settings. For users with the Standard Registry role only.',
    })
    @ApiBody({
        description: 'Settings.',
        required: true,
        type: SettingsDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SettingsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async updateSettings(
        @AuthUser() user: IAuthUser,
        @Body() body: SettingsDTO
    ): Promise<any> {
        try {
            const settings = body as CommonSettings;
            const guardians = new Guardians();
            await Promise.all([guardians.updateSettings(user, settings)]);
            return null;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get settings
     */
    @Get('/')
    @Auth(
        Permissions.SETTINGS_SETTINGS_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns current settings.',
        description: 'Returns current settings. For users with the Standard Registry role only.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: SettingsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(SettingsDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getSettings(
        @AuthUser() user: IAuthUser,
    ): Promise<SettingsDTO> {
        try {
            const guardians = new Guardians();
            const [guardiansSettings] = await Promise.all([guardians.getSettings(user)]);
            return { ...guardiansSettings } as any;
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get settings
     */
    @Get('/environment')
    @Auth()
    @ApiOperation({
        summary: 'Returns current environment name.',
        description: 'Returns current environment name.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getEnvironment(
        @AuthUser() user: IAuthUser
    ): Promise<string> {
        try {
            const guardians = new Guardians();
            return await guardians.getEnvironment(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get about
     */
    @Get('/about')
    @Auth(
        Permissions.SETTINGS_SETTINGS_READ,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Returns package version.',
        description: 'Returns package version. For users with the Standard Registry role only.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getAbout(): Promise<AboutInterface> {
        let version = this.cachedVersion;

        if (!version) {
            const envVersion = process.env.npm_package_version;
            if (envVersion) {
                version = envVersion;
            } else {
                const unknown = 'Unknown';
                try {
                    const packageJsonUrl = new URL('../../../package.json', import.meta.url);
                    const raw = fs.readFileSync(packageJsonUrl, 'utf-8');
                    const parsed = JSON.parse(raw);

                    version = parsed.version || unknown;
                } catch (error) {
                    version = unknown;
                }
            }

            this.cachedVersion = version;
        }

        return { version };
    }
}
