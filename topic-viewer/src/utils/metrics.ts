import express from 'express';
import client from 'prom-client';
import guardianServicePrometheusMetrics from 'prometheus-api-metrics';

const app = express();

const PORT = process.env.METRICS_PORT || 5009;

export const startMetricsServer = () => {
  app.use(guardianServicePrometheusMetrics());
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);

    return res.send(await client.register.metrics());
  });

  app.listen(PORT, () => {
    console.log(`topic-viewer metrics server started at http://localhost:${PORT}`);
  });
}
