import { permissionHelper } from '@auth/authorization-helper';
import { Guardians } from '@helpers/guardians';
import { Request, Response, Router } from 'express';
import { UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';
import * as fs from 'fs';

/**
 * Branding route
 */
export const brandingAPI = Router();

brandingAPI.post('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: Request, res: Response) => {
    try {
        const { headerColor, primaryColor, companyName, companyLogoUrl, loginBannerUrl, faviconUrl } = req.body;

        const data = {
            headerColor,
            primaryColor,
            companyName,
            companyLogoUrl,
            loginBannerUrl,
            faviconUrl
        };

        await fs.writeFileSync('../frontend/src/assets/branding.json', JSON.stringify(data));
        res.status(204).end()
    } catch (error) {
        console.log(error)
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

brandingAPI.get('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: Request, res: Response) => {
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
        res.status(500).json({ code: 500, message: error.message });
    }
})