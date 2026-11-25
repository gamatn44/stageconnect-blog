const mongoose = require('mongoose');

const TYPES = ['PFA', 'PFE', 'ETE', 'INITIATION', 'AUTRE'];

const offreSchema = new mongoose.Schema(
  {
    titre: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true },
    domaine: { type: mongoose.Schema.Types.ObjectId, ref: 'Domaine', required: true },
    ville: { type: String, required: true, trim: true },
    dureeMois: { type: Number, required: true, min: 1, max: 12 },
    typeStage: { type: String, enum: TYPES, default: 'AUTRE' },
    competences: { type: [String], default: [], set: (arr) => arr.map((c) => String(c).trim().toLowerCase()) },

    // L'entreprise vit dans la base du service Auth : on ne stocke que son id (pas de jointure inter-bases)
    entrepriseId: { type: String, index: true },
    entrepriseNom: { type: String, trim: true },
    entrepriseKey: { type: String, index: true },

    statut: { type: String, enum: ['ouverte', 'cloturee'], default: 'ouverte' },
    dateLimite: { type: Date },
    dateCloture: { type: Date },
    raisonCloture: { type: String, enum: ['manuelle', 'date_limite'] },

    // Offres importées (shopping)
    source: { type: String, enum: ['interne', 'externe'], default: 'interne' },
    sourceName: { type: String },
    externalId: { type: String },
    urlExterne: { type: String },

    // Détection de doublons
    fingerprint: { type: String, index: true },
    doublonPotentiel: { type: Boolean, default: false },
  },
  { timestamps: true }
);

offreSchema.index(
  { titre: 'text', description: 'text', competences: 'text', entrepriseNom: 'text' },
  { weights: { titre: 10, competences: 5, entrepriseNom: 3, description: 1 }, default_language: 'french', name: 'offre_text' }
);
offreSchema.index({ statut: 1, domaine: 1, ville: 1 });
offreSchema.index({ statut: 1, dateLimite: 1 });
offreSchema.index({ source: 1, externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } });

offreSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.__v; delete ret.fingerprint; delete ret.entrepriseKey; return ret; },
});

module.exports = mongoose.model('Offre', offreSchema);
module.exports.TYPES = TYPES;
