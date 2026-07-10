import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiExtraModels, ApiNoContentResponse, ApiTags, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiBody } from '@nestjs/swagger';
import {Auth, AuthUser} from '#auth';
import { Permissions } from '@guardian/interfaces';
import { BrandingDTO, InternalServerErrorDTO, ObjectExamples } from '#middlewares';
import { ONLY_SR, Guardians, UseCache, InternalException, CacheService } from '#helpers';
import { CACHE_PREFIXES } from '#constants';
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
        type: BrandingDTO,
        examples: {
            default: {
                summary: 'Update branding',
                value: { headerColor: '#0031ff', headerColor1: '#8259ef', primaryColor: '#0031ff', companyName: 'GUARDIAN', companyLogoUrl: '/assets/images/logo.png', loginBannerUrl: '/assets/bg.jpg', faviconUrl: 'favicon.ico' }
            }
        }
    })
    @ApiNoContentResponse({
        description: 'Branding updated successfully. No response body.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
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
                termsAndConditions,
                useCustomMenuColors,
                useSolidBackground
            } = body;

            const data = {
                headerColor,
                primaryColor,
                companyName,
                companyLogoUrl,
                loginBannerUrl,
                faviconUrl,
                headerColor1,
                termsAndConditions,
                useCustomMenuColors,
                useSolidBackground
            };
            const guardians = new Guardians();
            await guardians.setBranding(user, JSON.stringify(data));

            // Branding is a global resource: drop every cached GET variant
            // (per-user and anonymous tags alike), not just the saving user's.
            await this.cacheService.invalidateAllTagsByPrefixes([`${CACHE_PREFIXES.TAG}${req.url.split('?')[0]}`]);
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
        examples: {
            default: {
                summary: 'Default example',
                value: ObjectExamples.BRANDING
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
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
