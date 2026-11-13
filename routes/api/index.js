const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users',require('./user.routes'));
router.use('/historiques', require('./historique.routes'));

module.exports = router;
