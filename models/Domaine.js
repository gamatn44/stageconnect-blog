const mongoose = require('mongoose');

const domaineSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    // mots-clés utilisés pour le "shopping" d'offres externes
    motsCles: { type: [String], default: [] },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Domaine', domaineSchema);
