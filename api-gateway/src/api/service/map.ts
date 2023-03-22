import { Response, Router } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';

/**
 * Map route
 */
export const mapAPI = Router();

mapAPI.get(
    '/key',
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const guardians = new Guardians();
            res.status(200).send(await guardians.getMapApiKey());
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            res.status(500).send({
                code: error.code || 500,
                message: error.message,
            });
        }
    }
);
