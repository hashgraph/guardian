import validate from '../middlewares/validation';
import { storeWebhookSchema, updateWebhookSchema } from '../middlewares/validation/schemas/webhook';
import { Request, Response, Router, NextFunction } from 'express';
import WebhookService from '../services/WebhookService';
import MongodbAdapter from '../connections/db/MongodbAdapter';
import { Webhook } from '../entities/Webhook';

const webhookRoutes = Router();
const dbConnection = new MongodbAdapter();
const webhookService = new WebhookService(dbConnection);

webhookRoutes.post('/api/webhooks', validate(storeWebhookSchema()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = new Webhook();
    webhook.url = req.body?.url;
    webhook.events = req.body?.events || [];
    await webhookService.saveWebhook(webhook);
    return res.status(201).send({ id: webhook._id });
  } catch (e) {
    return next(e);
  }
});

webhookRoutes.get('/api/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhooks = await webhookService.getWebhooks();
    return res.json(webhooks);
  } catch (e) {
    return next(e);
  }
});

webhookRoutes.delete('/api/webhooks/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    await webhookService.removeWebhook(id);
    return res.sendStatus(204);
  } catch (err: any) {
    return next(err);
  }
});

webhookRoutes.get('/api/webhooks/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const webhook = await webhookService.findWebhook(id);
    if (!webhook) {
      return res.status(404).send('Webhook not found');
    }
    return res.json(webhook);
  } catch (err: any) {
    return next(err);
  }
});

webhookRoutes.put('/api/webhooks/:id', validate(updateWebhookSchema()), async (
  req: Request, res: Response, next: NextFunction
) => {
  const { id } = req.params;
  try {
    const webhook = await webhookService.findWebhook(id);
    if (!webhook) {
      return res.status(404).send('Webhook not found');
    }
    webhook.url = req.body?.url;
    webhook.events = req.body?.events;
    await webhookService.saveWebhook(webhook);
    return res.sendStatus(204);
  } catch (err: any) {
    return next(err);
  }
});

export default webhookRoutes
