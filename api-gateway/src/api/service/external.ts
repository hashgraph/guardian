import { Request, Response, Router } from 'express';
// import {PolicyComponentsUtils} from '@policy-engine/policy-components-stuff';

/**
 * Route for demo api
 */
export const externalAPI = Router();

externalAPI.post('/', async (req: Request, res: Response) => {
    try {
        const data = req.body
        // await PolicyComponentsUtils.ReceiveExternalData(data);
        res.status(201).json(true);
    } catch (e) {
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});
