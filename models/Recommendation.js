const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['LINKEDIN_SCRAPING', 'PARRAINAGE_ETUDIANT', 'ALGORITHME_MATCHING', 'MANUELLE'],
    required: true
  },
  parrainId: { type: String, default: null },
  etudiantCibleId: { type: String, required: true },
  offreId: { type: String, default: null },
  linkedInData: {
    titrePoste: { type: String, default: null },
    entreprise: { type: String, default: null },
    lieu: { type: String, default: null },
    lien: { type: String, default: null }
  },
  commentaire: { type: String, default: '' },
  isUrgente: { type: Boolean, default: false },
  statut: {
    type: String,
    enum: ['ENVOYEE', 'VUE', 'ACCEPTEE', 'REFUSEE'],
    default: 'ENVOYEE'
  }
}, { timestamps: true });

module.exports = mongoose.model('Recommendation', recommendationSchema);
