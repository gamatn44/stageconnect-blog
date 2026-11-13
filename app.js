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

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = app;
