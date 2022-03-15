import { permissionHelper } from '@auth/authorizationHelper';
import { Guardians } from '@helpers/guardians';
import { IPFS } from '@helpers/ipfs';
import { Request, Response, Router } from 'express';
import { CommonSettings, UserRole } from 'interfaces';
import { Logger } from 'logger-helper';

/**
 * Settings route
 */
export const settingsAPI = Router();

settingsAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const settings = req.body as CommonSettings;
        if (!settings || Object.keys(settings).length === 0) {
            throw new Error("Invalid settings");
        }
        const guardians = new Guardians();
        const ipfs = new IPFS();
        await Promise.all([
            guardians.updateSettings(settings),
            ipfs.updateSettings(settings)
        ]);
        res.json(null);
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});

settingsAPI.get('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const ipfs = new IPFS();
        const [guardiansSettings, ipfsClientSettings] =  await Promise.all([
            guardians.getSettings(),
            ipfs.getSettings()
        ]);
        res.json({
            ...guardiansSettings,
            ...ipfsClientSettings
        });
    } catch (error) {
        new Logger().error(error.toString(), ['API_GATEWAY']);
        res.status(500).json({ code: 500, message: error.message });
    }
});
