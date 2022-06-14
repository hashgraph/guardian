import { Request, Response, Router } from 'express';
import { PolicyEngine } from '@helpers/policyEngine';
import { Logger } from '@guardian/common';
// import {PolicyComponentsUtils} from '@policy-engine/policy-components-stuff';

/**
 * Route for demo api
 */
export const externalAPI = Router();

externalAPI.post('/', async (req: Request, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.recieveExternalData(req.body));
    } catch (error) {
        console.error(error);
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + error.message });
    }
});
