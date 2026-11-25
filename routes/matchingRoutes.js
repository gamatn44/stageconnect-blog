const express = require('express');
const router = express.Router();
const matchingController = require('../controller/MatchingController');

router.post('/', matchingController.createMatch);
router.get('/', matchingController.getAllMatchings);
router.get('/stats', matchingController.getMatchingStats);
router.get('/:id', matchingController.getMatchById);
router.put('/:id', matchingController.updateMatch);
router.delete('/:id', matchingController.deleteMatch);

module.exports = router;
