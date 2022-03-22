import { Request, Response, Router } from 'express';
import {PolicyEngine} from '@helpers/policyEngine';
import { Logger } from 'logger-helper';
// import {PolicyComponentsUtils} from '@policy-engine/policy-components-stuff';

/**
 * Route for demo api
 */
export const externalAPI = Router();

externalAPI.post('/', async (req: Request, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.recieveExternalData(req.body));
    } catch (e) {
        console.error(e);
        new Logger().error(e.toString(), ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});
