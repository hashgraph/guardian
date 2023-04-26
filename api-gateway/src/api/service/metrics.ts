import { Request, Response, Router } from 'express';
import client from 'prom-client';

export const metricsAPI = Router();

metricsAPI.get('/', async (req: Request, res: Response) => {
    res.set('Content-Type', client.register.contentType);
    return res.send(await client.register.metrics());
});
