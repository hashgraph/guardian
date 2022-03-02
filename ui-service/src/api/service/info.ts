import { Request, Response, Router } from 'express';

/**
 * System info route
 */
export const infoAPI = Router();

infoAPI.get('/', async (req: Request, res: Response) => {
  res.status(200).json({
    NAME: 'ui-service',
    BUILD_VERSION: process.env.BUILD_VERSION,
    DEPLOY_VERSION: process.env.DEPLOY_VERSION,
    OPERATOR_ID: process.env.OPERATOR_ID,
  });
});
