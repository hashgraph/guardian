import { Response, Router, NextFunction } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import createError from 'http-errors';

/**
 * Theme route
 */
export const themesAPI = Router();

/**
 * Create Theme
 */
themesAPI.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        const item = await guardians.createTheme(req.body, req.user.did);
        return res.status(201).json(item);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

/**
 * Update Theme
 */
themesAPI.put('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const newTheme = req.body;
        const guardians = new Guardians();
        if (!newTheme?.id) {
            return next(createError(404, 'Theme not found.'));
        }
        const oldTheme = await guardians.getThemeById(newTheme.id);
        if (!oldTheme) {
            return next(createError(404, 'Theme not found.'));
        }
        const theme = await guardians.updateTheme(newTheme.id, newTheme, user.did);
        return res.json(theme);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

/**
 * Delete Theme
 */
themesAPI.delete('/:themeId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const guardians = new Guardians();
        if (!req.params.themeId) {
            return next(createError(422, 'Invalid theme id'));
        }
        const result = await guardians.deleteTheme(req.params.themeId, req.user.did);
        return res.json(result);
    } catch (error) {
        await (new Logger()).error(error, ['API_GATEWAY']);
        return next(error);
    }
});

/**
 * Get Themes
 */
themesAPI.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        if (user.did) {
            const themes = await guardians.getThemes(user.did);
            return res.send(themes);
        }
        return res.send([]);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

/**
 * Import Theme
 */
themesAPI.post('/import/file', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const theme = await guardian.importThemeFile(req.body, req.user.did);
        return res.status(201).send(theme);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});

/**
 * Export Theme
 */
themesAPI.get('/:themeId/export/file', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const guardian = new Guardians();
    try {
        const file: any = await guardian.exportThemeFile(req.params.themeId, req.user.did);
        res.setHeader('Content-disposition', `attachment; filename=theme_${Date.now()}`);
        res.setHeader('Content-type', 'application/zip');
        return res.send(file);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});