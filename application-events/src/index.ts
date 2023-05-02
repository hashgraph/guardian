import express, { NextFunction, Request, Response } from 'express';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import eventRoutes from './routes/events';
import webhookRoutes from './routes/webooks';

import EventListenerService from './services/EventListenerService';

const configPath = path.join(process.cwd(), 'docs', 'swagger.yaml');
const swaggerDocument = yaml.load(readFileSync(configPath, 'utf8'), {
  json: false,
  schema: yaml.JSON_SCHEMA,
});

const port = process.env.PORT || 3012;
const app = express();

app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

(async () => {
  const eventListenerService = new EventListenerService();
  await eventListenerService.listen();
})();

app.get('/', (req, res) => {
  res.send('Everything is working');
});

app.use(webhookRoutes);
app.use(eventRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument!));

// tslint:disable-next-line:handle-callback-err
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  return res.status(err?.status || 500).json({code: err?.status || 500, message: err.message});
});

app.listen(port, () => {
  console.log(`application-events app listening at http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
});

export default app;
