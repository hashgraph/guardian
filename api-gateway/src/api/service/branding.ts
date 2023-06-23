import { Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Logger } from '@guardian/common';
import { Response } from 'express';
import { Guardians } from '@helpers/guardians';
import { checkPermission } from '@auth/authorization-helper';
import { UserRole } from '@guardian/interfaces';
import { ApiTags } from '@nestjs/swagger';

/**
 * Branding route
 */
@Controller('branding')
@ApiTags('branding')
export class BrandingApi {

  @Post('/')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setBranding(
    @Req() req,
    @Res() res: Response): Promise<any> {
      await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
      try {
        const {
          headerColor,
          primaryColor,
          companyName,
          companyLogoUrl,
          loginBannerUrl,
          faviconUrl
        } = req.body;

        const data = {
          headerColor,
          primaryColor,
          companyName,
          companyLogoUrl,
          loginBannerUrl,
          faviconUrl
        };

        const guardians = new Guardians();
        await guardians.setBranding(JSON.stringify(data));
      } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        throw error;
      }

      return res.status(204).end();
  }

  @Get('/')
  async getBranding(@Res() res: Response): Promise<any> {
    try {
      const guardians = new Guardians();
      const brandingDataString = await guardians.getBranding();
      const brandingData = JSON.parse(brandingDataString.config);
      return res.json(brandingData);
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      throw error;
    }
  }
}
