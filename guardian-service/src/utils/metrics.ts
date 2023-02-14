import express from 'express';
import client from 'prom-client';
import guardianServicePrometheusMetrics from 'prometheus-api-metrics';

const app = express();

const PORT = process.env.PORT || 3003;

export const serviceResponseTimeHistogram = new client.Histogram({
  name: 'guardian_service_response_time_duration_seconds',
  help: 'Guardian service response time in seconds',
  labelNames: ['operation', 'success'],
});

export const startMetricsServer = () => {
  app.use(guardianServicePrometheusMetrics());
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);

    return res.send(await client.register.metrics());
  });

  app.listen(PORT, () => {
    console.log(`guardian-service metrics server started at http://localhost:${PORT}`);
  });
}
