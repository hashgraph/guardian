import { IAuthUser } from '@guardian/common';
import { CacheService, EntityOwner, getCacheKey, Guardians, InternalException, ONLY_SR, UseCache } from '#helpers';
import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Req, Response } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiOkResponse, ApiInternalServerErrorResponse, ApiExtraModels, ApiParam } from '@nestjs/swagger';
import { Permissions } from '@guardian/interfaces';
import { AuthUser, Auth } from '#auth';
import { Examples, InternalServerErrorDTO, ThemeDTO } from '#middlewares';
import { PREFIXES } from '#constants';

@Controller('themes')
@ApiTags('themes')
export class ThemesApi {

    constructor(private readonly cacheService: CacheService) {
    }

    /**
     * Create theme
     */
    @Post('/')
    @Auth(
        Permissions.SETTINGS_THEME_CREATE,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Creates a new theme.',
        description: 'Creates a new theme.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains a theme.',
        required: true,
        type: ThemeDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ThemeDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ThemeDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async setThemes(
        @AuthUser() user: IAuthUser,
        @Body() theme: ThemeDTO,
        @Req() req,
    ): Promise<ThemeDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);

            const invalidedCacheKeys = [
                `${PREFIXES.THEMES}`
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], req.user));

            return await guardians.createTheme(theme, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Update theme
     */
    @Put('/:themeId')
    @Auth(
        Permissions.SETTINGS_THEME_UPDATE,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Updates theme configuration.',
        description: 'Updates theme configuration for the specified theme ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'themeId',
        type: 'string',
        required: true,
        description: 'Theme Identifier',
        example: Examples.DB_ID,
    })
    @ApiBody({
        description: 'Object that contains a theme.',
        required: true,
        type: ThemeDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ThemeDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ThemeDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async updateTheme(
        @AuthUser() user: IAuthUser,
        @Param('themeId') themeId: string,
        @Body() theme: ThemeDTO,
        @Req() req
    ): Promise<ThemeDTO> {
        try {
            if (!themeId) {
                throw new HttpException('Invalid theme id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            const oldTheme = await guardians.getThemeById(themeId, owner);
            if (!oldTheme) {
                throw new HttpException('Theme not found.', HttpStatus.NOT_FOUND);
            }

            const invalidedCacheKeys = [
                `${PREFIXES.THEMES}${req.params.themeId}/export/file`,
                `${PREFIXES.THEMES}`
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return await guardians.updateTheme(themeId, theme, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Delete theme
     */
    @Delete('/:themeId')
    @Auth(
        Permissions.SETTINGS_THEME_UPDATE,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Deletes the theme.',
        description: 'Deletes the theme with the provided theme ID.' + ONLY_SR,
    })
    @ApiParam({
        name: 'themeId',
        type: 'string',
        required: true,
        description: 'Theme Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async deleteTheme(
        @AuthUser() user: IAuthUser,
        @Param('themeId') themeId: string,
        @Req() req
    ): Promise<boolean> {
        try {
            if (!themeId) {
                throw new HttpException('Invalid theme id', HttpStatus.UNPROCESSABLE_ENTITY)
            }
            const owner = new EntityOwner(user);
            const guardians = new Guardians();

            const invalidedCacheKeys = [
                `${PREFIXES.THEMES}${req.params.themeId}/export/file`,
                `${PREFIXES.THEMES}`
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return await guardians.deleteTheme(themeId, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get all themes
     */
    @Get('/')
    @Auth(
        Permissions.SETTINGS_THEME_READ,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Returns a list of all themes.',
        description: 'Returns a list of all themes.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ThemeDTO,
        isArray: true
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ThemeDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async getThemes(
        @AuthUser() user: IAuthUser
    ): Promise<ThemeDTO[]> {
        try {
            const guardians = new Guardians();
            if (user.did) {
                const owner = new EntityOwner(user);
                return await guardians.getThemes(owner);
            } else {
                return [];
            }
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Import theme
     */
    @Post('/import/file')
    @Auth(
        Permissions.SETTINGS_THEME_CREATE,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Imports new theme from a zip file.',
        description: 'Imports new theme from the provided zip file into the local DB.' + ONLY_SR,
    })
    @ApiBody({
        description: 'A zip file containing theme to be imported.',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ThemeDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(ThemeDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async importTheme(
        @AuthUser() user: IAuthUser,
        @Body() zip: any,
        @Req() req
    ): Promise<ThemeDTO> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);

            const invalidedCacheKeys = [
                `${PREFIXES.THEMES}`
            ];

            await this.cacheService.invalidate(getCacheKey([req.url, ...invalidedCacheKeys], user))

            return await guardian.importThemeFile(zip, owner);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Export theme
     */
    @Get('/:themeId/export/file')
    @Auth(
        Permissions.SETTINGS_THEME_CREATE,
        // UserRole.STANDARD_REGISTRY
    )
    @ApiOperation({
        summary: 'Returns a zip file containing the theme.',
        description: 'Returns a zip file containing the theme.' + ONLY_SR,
    })
    @ApiParam({
        name: 'themeId',
        type: 'string',
        required: true,
        description: 'Theme Identifier',
        example: Examples.DB_ID,
    })
    @ApiOkResponse({
        description: 'Successful operation. Response zip file.'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    @UseCache()
    async exportTheme(
        @AuthUser() user: IAuthUser,
        @Param('themeId') themeId: string,
        @Response() res: any
    ): Promise<any> {
        const guardian = new Guardians();
        try {
            const owner = new EntityOwner(user);
            const file: any = await guardian.exportThemeFile(themeId, owner);
            res.header('Content-disposition', `attachment; filename=theme_${Date.now()}`);
            res.header('Content-type', 'application/zip');
            return res.send(file);
        } catch (error) {
            await InternalException(error);
        }
    }
}
