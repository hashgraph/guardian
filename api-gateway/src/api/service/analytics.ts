import { Guardians } from '@helpers/guardians';
import { Response, Router } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';

/**
 * User analytics route
 */
export const analyticsAPI = Router();

analyticsAPI.get('/compare/policies', async (req: AuthenticatedRequest, res: Response) => {
    const guardians = new Guardians();
    const policyId1 = req.query ? req.query.policyId1 : null;
    const policyId2 = req.query ? req.query.policyId2 : null;
    const eventsLvl = req.query ? req.query.eventsLvl : null;
    const propLvl = req.query ? req.query.propLvl : null;
    const childrenLvl = req.query ? req.query.childrenLvl : null;
    const idLvl = req.query ? req.query.idLvl : null;
    const user = req.user;
    try {
        const result = await guardians.comparePolicies(
            user, 
            policyId1, 
            policyId2, 
            eventsLvl, 
            propLvl, 
            childrenLvl,
            idLvl
        );
        res.send(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});

analyticsAPI.get('/compare/schemas', async (req: AuthenticatedRequest, res: Response) => {
    const guardians = new Guardians();
    const schemaId1 = req.query ? req.query.schemaId1 : null;
    const schemaId2 = req.query ? req.query.schemaId2 : null;
    const idLvl = req.query ? req.query.idLvl : null;
    const user = req.user;
    try {
        const result = await guardians.compareSchemas(user, schemaId1, schemaId2, idLvl);
        res.send(result);
    } catch (error) {
        new Logger().error(error, ['API_GATEWAY']);
        res.status(500).send({ code: 500, message: error.message });
    }
});