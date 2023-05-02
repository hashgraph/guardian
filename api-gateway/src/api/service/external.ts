import { Request, Response, Router, NextFunction } from 'express';
import { PolicyEngine } from '@helpers/policy-engine';
import { Logger } from '@guardian/common';

/**
 * Route for demo api
 */
export const externalAPI = Router();

externalAPI.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.receiveExternalData(req.body));
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        return next(error);
    }
});
