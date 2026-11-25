const express = require('express');
const proxyRouter = require('./routes/proxy');

const PORT = process.env.PORT || 3000;
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

app.use('/', proxyRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route inconnue' });
});

app.use((err, req, res, next) => {
  const status = err.message.startsWith('Aucune instance') ? 503 : 502;
  console.error('[gateway]', err.message);
  res.status(status).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[gateway] port ${PORT}`);
});
