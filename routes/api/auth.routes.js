const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth.controller');

router.post('/register', authController.register);
router.get('/verifier-email/:token', authController.verifierEmail);
router.post('/renvoyer-verification', authController.renvoyerVerification);
router.post('/login', authController.login);
router.post('/mot-de-passe-oublie', authController.motDePasseOublie);
router.post('/reinitialiser-mot-de-passe', authController.reinitialiserMotDePasse);

module.exports = router;
