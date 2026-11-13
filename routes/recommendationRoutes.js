const express = require('express');
const router = express.Router();
const recController = require('../controller/RecommendationController');

router.post('/', recController.createRecommendation);
router.post('/parrainage', recController.createParrainage);
router.post('/scrape-linkedin', recController.triggerLinkedInScraping);
router.get('/', recController.getAllRecommendations);
router.get('/stats', recController.getRecommendationStats);
router.get('/:id', recController.getRecommendationById);
router.put('/:id', recController.updateRecommendation);
router.delete('/:id', recController.deleteRecommendation);

module.exports = router;
