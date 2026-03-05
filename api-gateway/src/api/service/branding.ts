import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiExtraModels, ApiNoContentResponse, ApiTags, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiBody } from '@nestjs/swagger';
import {Auth, AuthUser} from '#auth';
import { Permissions } from '@guardian/interfaces';
import { BrandingDTO, InternalServerErrorDTO } from '#middlewares';
import { ONLY_SR, Guardians, UseCache, InternalException, getCacheKey, CacheService } from '#helpers';
import {IAuthUser, PinoLogger} from '@guardian/common';

/**
 * Branding route
 */
@Controller('branding')
@ApiTags('branding')
export class BrandingApi {
    constructor(private readonly cacheService: CacheService, private readonly logger: PinoLogger) {
    }

    /**
     * Set branding
     */
    @Post('/')
    @Auth(
        Permissions.BRANDING_CONFIG_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Update branding.',
        description: 'Update branding.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains config.',
        required: true,
        type: BrandingDTO
    })
    @ApiNoContentResponse({
        description: 'Branding updated successfully.',
        example: { result: 'ok' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(BrandingDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.NO_CONTENT)
    async setBranding(
        @Body() body: BrandingDTO,
        @Req() req,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const {
                headerColor,
                primaryColor,
                companyName,
                companyLogoUrl,
                loginBannerUrl,
                faviconUrl,
                headerColor1,
                termsAndConditions
            } = body;

            const data = {
                headerColor,
                primaryColor,
                companyName,
                companyLogoUrl,
                loginBannerUrl,
                faviconUrl,
                headerColor1,
                termsAndConditions
            };
            const guardians = new Guardians();
            await guardians.setBranding(user, JSON.stringify(data));

            await this.cacheService.invalidate(getCacheKey([req.url], req.user))
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    /**
     * Get branding
     */
    @Get('/')
    @ApiOperation({
        summary: 'Returns branding configuration.',
        description: 'Returns current branding configuration.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BrandingDTO,
        example: { headerColor: 'string', primaryColor: 'string', companyName: 'string', companyLogoUrl: 'https://example.com', loginBannerUrl: 'https://example.com', faviconUrl: 'https://example.com', headerColor1: 'string', termsAndConditions: 'string' }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(BrandingDTO, InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getBranding(): Promise<any> {
        try {
            const guardians = new Guardians();
            const brandingDataString = await guardians.getBranding();
            return JSON.parse(brandingDataString.config);
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }
}
