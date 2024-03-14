import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Logger } from '@guardian/common';
import { Guardians } from '../../helpers/guardians.js';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../auth/auth.decorator.js';
import { UserRole } from '@guardian/interfaces';

/**
 * Branding route
 */
@Controller('branding')
@ApiTags('branding')
export class BrandingApi{

    @Auth(UserRole.STANDARD_REGISTRY)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post('/')
    async setBranding(@Body() body: any): Promise<any> {
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

          console.log("hello");
            const guardians = new Guardians();
            await guardians.setBranding(JSON.stringify(data));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }

        return;
    }

    @Get('/')
    async getBranding(): Promise<any> {
        try {
            const guardians = new Guardians();
            const brandingDataString = await guardians.getBranding();
            const brandingData = JSON.parse(brandingDataString.config);
            return brandingData;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}
