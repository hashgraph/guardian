import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExtraModels, ApiTags, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Auth } from '../../auth/auth.decorator.js';
import { Permissions } from '@guardian/interfaces';
import { BrandingDTO, InternalServerErrorDTO } from 'middlewares/validation/index.js';
import { ONLY_SR, Guardians, UseCache, InternalException } from '../../helpers/index.js';

/**
 * Branding route
 */
@Controller('branding')
@ApiTags('branding')
export class BrandingApi {
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
    @ApiOkResponse({
        description: 'Successful operation.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(BrandingDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.NO_CONTENT)
    async setBranding(
        @Body() body: BrandingDTO
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
            await guardians.setBranding(JSON.stringify(data));
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get branding
     */
    @Get('/')
    @ApiOkResponse({
        description: 'Successful operation.',
        type: BrandingDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
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
            await InternalException(error);
        }
    }
}
