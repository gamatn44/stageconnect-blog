const express = require('express');
const router = express.Router();
const historiqueController = require('../../controllers/historique.controller');
const { authentifier, exigerRole } = require('../../middlewares/auth');

// Tout le CRUD Historique est réservé aux admins.
router.use(authentifier, exigerRole('admin'));

router.post('/', historiqueController.createHistorique);
router.get('/', historiqueController.getAllHistoriques);
router.get('/stats', historiqueController.getHistoriqueStats); // avant /:id
router.get('/:id', historiqueController.getHistoriqueById);
router.put('/:id', historiqueController.updateHistorique);
router.delete('/:id', historiqueController.deleteHistorique);

module.exports = router;
