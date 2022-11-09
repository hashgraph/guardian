import { permissionHelper } from '@auth/authorization-helper';
import { Guardians } from '@helpers/guardians';
import { Request, Response, Router } from 'express';
import { CommonSettings, UserRole } from '@guardian/interfaces';
import { Logger } from '@guardian/common';

/**
 * Settings route
 */
export const settingsAPI = Router();

settingsAPI.post('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: Request, res: Response) => {
    try {
        const settings = req.body as CommonSettings;
        if (!settings || Object.keys(settings).length === 0) {
            throw new Error('Invalid settings');
        }
        const guardians = new Guardians();
        await Promise.all([
            guardians.updateSettings(settings)
        ]);
        res.json(null);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

settingsAPI.get('/', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: Request, res: Response) => {
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
});

settingsAPI.get('/environment', async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const environment = await guardians.getEnvironment();
        res.send(environment);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
})