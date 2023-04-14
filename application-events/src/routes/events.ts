import { Request, Response, Router } from 'express';
import { externalMessageEvents } from '../services/ApplicationMetricService';
import NatsPubSubAdapter from '../connections/pub-subs/NatsPubSubAdapter';

const eventRoutes = Router();

eventRoutes.get('/api/events', async (req: Request, res: Response) => {
  return res.json(externalMessageEvents);
});

eventRoutes.get('/api/events/subscribe', async (req: Request, res: Response) => {
  const natsPubSubAdapter = new NatsPubSubAdapter();
  try {
    res.type('application/json');
    res.set('Transfer-Encoding', 'chunked');

    res.write(`[\n`);
    for (const subject of externalMessageEvents) {
      await natsPubSubAdapter.subscribe(subject, (data: any) => {
        if (data) {
          console.log('data.received.stringify', JSON.stringify(data))
          res.write(`${JSON.stringify({subject, payload: data})},\n`);
        }
      });
    }
  } catch (e: any) {
    console.error('Connection to NATS closed', e.message);
    res.write('{"connection": "closed"}]');
    return res.write(`]\n`);
    res.end();
  }
});

export default eventRoutes;
