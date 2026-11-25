const Recommendation = require('../models/Recommendation');
const { scrapeLinkedInRecommendations } = require('../services/linkedinScraperService');

// 1. CREATE NORMALE (CRUD - POST /api/recommendations)
exports.createRecommendation = async (req, res) => {
  try {
    const rec = await Recommendation.create({
      source: req.body.source || 'MANUELLE',
      etudiantCibleId: req.body.etudiantCibleId,
      offreId: req.body.offreId,
      commentaire: req.body.commentaire,
      isUrgente: req.body.isUrgente || false,
      statut: req.body.statut || 'ENVOYEE'
    });
    res.status(201).json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. MÉTIER 1 : PARRAINAGE ÉTUDIANT (POST /api/recommendations/parrainage)
exports.createParrainage = async (req, res) => {
  try {
    const { parrainId, etudiantCibleId, offreId, commentaire, isUrgente } = req.body;
    const rec = await Recommendation.create({
      source: 'PARRAINAGE_ETUDIANT',
      parrainId,
      etudiantCibleId,
      offreId,
      commentaire,
      isUrgente: isUrgente || false,
      statut: 'ENVOYEE'
    });
    res.status(201).json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. MÉTIER 2 : WEB SCRAPING LINKEDIN (POST /api/recommendations/scrape-linkedin)
exports.triggerLinkedInScraping = async (req, res) => {
  try {
    const { etudiantId, domainKeyword, location } = req.body;
    const results = await scrapeLinkedInRecommendations(etudiantId, domainKeyword, location);
    res.status(200).json({ message: "Scraping réussi", count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. READ : GET ALL avec Filter + Recherche + Trie + Pagination
exports.getAllRecommendations = async (req, res) => {
  try {
    const { etudiantCibleId, isUrgente, source, statut, search, order, page = 1, limit = 10 } = req.query;
    
    let filter = {};
    if (etudiantCibleId) filter.etudiantCibleId = etudiantCibleId;
    if (isUrgente !== undefined) filter.isUrgente = isUrgente === 'true';
    if (source) filter.source = source;
    if (statut) filter.statut = statut;
    if (search) {
      filter.$or = [
        { 'linkedInData.titrePoste': { $regex: search, $options: 'i' } },
        { 'linkedInData.entreprise': { $regex: search, $options: 'i' } },
        { commentaire: { $regex: search, $options: 'i' } },
        { offreId: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const list = await Recommendation.find(filter)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Recommendation.countDocuments(filter);

    res.json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: list
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. GET BY ID
exports.getRecommendationById = async (req, res) => {
  try {
    const rec = await Recommendation.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: "Recommandation introuvable" });
    res.json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. MÉTIER 3 : STATISTIQUES RECOMMANDATIONS (GET /api/recommendations/stats)
exports.getRecommendationStats = async (req, res) => {
  try {
    const total = await Recommendation.countDocuments();
    const fromLinkedIn = await Recommendation.countDocuments({ source: 'LINKEDIN_SCRAPING' });
    const fromParrainage = await Recommendation.countDocuments({ source: 'PARRAINAGE_ETUDIANT' });
    const fromAlgo = await Recommendation.countDocuments({ source: 'ALGORITHME_MATCHING' });
    const fromManuelle = await Recommendation.countDocuments({ source: 'MANUELLE' });
    const urgentes = await Recommendation.countDocuments({ isUrgente: true });

    res.json({
      totalRecommandations: total,
      fromLinkedIn,
      fromParrainage,
      fromAlgo,
      fromManuelle,
      urgentes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. UPDATE (CRUD - PUT /api/recommendations/:id)
exports.updateRecommendation = async (req, res) => {
  try {
    const updatedRec = await Recommendation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedRec) return res.status(404).json({ message: "Recommandation introuvable" });
    res.status(200).json(updatedRec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8. DELETE (CRUD - DELETE /api/recommendations/:id)
exports.deleteRecommendation = async (req, res) => {
  try {
    const deleted = await Recommendation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Recommandation introuvable" });
    res.json({ message: "Recommandation supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
