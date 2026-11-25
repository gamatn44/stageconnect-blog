const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dbConfig = require('./config/dbconnection.json');

const matchingRoutes = require('./routes/matchingRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();

// Connexion MongoDB
mongoose.connect(dbConfig.url)
  .then(() => console.log('Connecté à MongoDB :', dbConfig.url))
  .catch(err => console.error('Erreur connexion MongoDB :', err));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes du Microservice Matching & Recommendation
app.use('/api/matchings', matchingRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Route santé
app.get('/', (req, res) => {
  res.json({ service: 'Microservice Matching & Recommendation', port: 3004, status: 'OK' });
});
const Consul = require('consul');
const consul = new Consul({ host: '127.0.0.1', port: 8500 });

// Route /health pour le contrôle de santé Consul
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Enregistrement automatique dans Consul
const SERVICE_NAME = 'matching-recommendation-service';
const SERVICE_ID = 'matching-recommendation-3004';
const SERVICE_PORT = 3004;

consul.agent.service.register({
  id: SERVICE_ID,
  name: SERVICE_NAME,
  address: '127.0.0.1',
  port: SERVICE_PORT,
  check: {
    http: `http://127.0.0.1:${SERVICE_PORT}/health`,
    interval: '10s',
    timeout: '5s'
  }
}, (err) => {
  if (err) console.error('Erreur Consul:', err);
  else console.log(`[Consul] ${SERVICE_NAME} enregistré sur le port ${SERVICE_PORT}`);
});

// Désenregistrement propre à l'arrêt (Ctrl+C)
process.on('SIGINT', () => {
  consul.agent.service.deregister(SERVICE_ID, () => {
    process.exit();
  });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = app;

