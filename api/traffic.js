import express from 'express';
import trafficRouter from '../server/routes/traffic.js';

// Shared with local development; never start a listener in a serverless function.
const app = express();
app.use((req, _res, next) => {
  if (req.query.trafficEndpoint === 'usage') req.url = '/api/traffic/usage';
  next();
});
app.use(['/api/traffic', '/api/traffic.js'], trafficRouter);
app.use((_req, res) => res.status(404).json({ error: 'API endpoint not found' }));
export default app;
