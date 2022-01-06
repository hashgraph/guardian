import { Request, Response, Router } from 'express';

export const debugApi = Router();

debugApi.get('/protected', async (req: Request, res: Response) => {
  res.status(200).json({
    NAME: 'tymlez-service',
  });
});
