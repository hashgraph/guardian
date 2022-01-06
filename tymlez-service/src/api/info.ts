import { Request, Response, Router } from 'express';

export const infoApi = Router();

infoApi.get('/', async (req: Request, res: Response) => {
  res.status(200).json({
    NAME: 'tymlez-service',
    BUILD_VERSION: process.env.BUILD_VERSION,
    DEPLOY_VERSION: process.env.DEPLOY_VERSION,
    OPERATOR_ID: process.env.OPERATOR_ID,
  });
});
