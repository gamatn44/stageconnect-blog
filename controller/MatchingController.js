const Matching = require('../models/Matching');
const Recommendation = require('../models/Recommendation');
const { evaluerMatch } = require('../services/matchingLogic');

// CREATE (POST) - Calcul du match + Recommandation Automatique si score >= 70%
exports.createMatch = async (req, res) => {
  try {
    const { etudiant, offre } = req.body;
    const resultat = evaluerMatch(etudiant, offre);

    const match = await Matching.create({
      etudiantId: etudiant.id,
      offreId: offre.id,
      ...resultat
    });

    // Règle Métier : Si score >= 70% et non éliminé -> génération automatique d'une recommandation
    let autoRecommendation = null;
    if (!resultat.estElimine && resultat.score >= 70) {
      const dejaRecommandee = await Recommendation.findOne({
        source: 'ALGORITHME_MATCHING',
        etudiantCibleId: etudiant.id,
        offreId: offre.id
      });

      if (!dejaRecommandee) {
        autoRecommendation = await Recommendation.create({
          source: 'ALGORITHME_MATCHING',
          etudiantCibleId: etudiant.id,
          offreId: offre.id,
          commentaire: `Excellente compatibilité détectée automatiquement (${resultat.score}%) !`,
          isUrgente: resultat.isBoosted || false,
          statut: 'ENVOYEE'
        });
      }
    }

    res.status(201).json({
      match,
      recommandationAutomatique: autoRecommendation
        ? "Recommandation générée automatiquement (Score >= 70%)"
        : "Aucune recommandation générée (Score < 70%, éliminé, ou déjà existante)"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ : GET ALL avec Filter + Recherche + Trie + Pagination
exports.getAllMatchings = async (req, res) => {
  try {
    const { etudiantId, isBoosted, estElimine, search, sortBy, order, page = 1, limit = 10 } = req.query;
    
    let filter = {};
    if (etudiantId) filter.etudiantId = etudiantId;
    if (isBoosted !== undefined) filter.isBoosted = isBoosted === 'true';
    if (estElimine !== undefined) filter.estElimine = estElimine === 'true';
    if (search) {
      filter.$or = [
        { offreId: { $regex: search, $options: 'i' } },
        { raisonElimination: { $regex: search, $options: 'i' } }
      ];
    }

    const sortField = sortBy || 'score';
    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matches = await Matching.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Matching.countDocuments(filter);

    res.json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: matches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET BY ID
exports.getMatchById = async (req, res) => {
  try {
    const match = await Matching.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match introuvable" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE (PUT)
exports.updateMatch = async (req, res) => {
  try {
    const updated = await Matching.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Match introuvable" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Statistiques Métier (Stats)
exports.getMatchingStats = async (req, res) => {
  try {
    const totalMatchings = await Matching.countDocuments();
    const totalBoosted = await Matching.countDocuments({ isBoosted: true });
    const totalElimines = await Matching.countDocuments({ estElimine: true });

    const avgResult = await Matching.aggregate([
      { $group: { _id: null, moyenneScore: { $avg: "$score" } } }
    ]);
    const moyenneScore = avgResult.length > 0 ? Math.round(avgResult[0].moyenneScore) : 0;

    res.json({
      totalMatchings,
      totalBoosted,
      totalElimines,
      moyenneScore: `${moyenneScore}%`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.deleteMatch = async (req, res) => {
  try {
    const deleted = await Matching.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Match introuvable" });
    res.json({ message: "Match supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
