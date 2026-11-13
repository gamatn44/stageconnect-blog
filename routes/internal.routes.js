const router = require('express').Router();
const c = require('../controllers/offre.controller');

// GET /internal/offres/:id/verification -> 200 si ouverte, 409 si clôturée/expirée, 404 si inconnue
router.get('/offres/:id/verification', c.verification);

module.exports = router;
