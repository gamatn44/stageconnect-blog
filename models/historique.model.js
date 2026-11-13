const mongoose = require('mongoose');
const { archiverHistorique } = require('../utils/discord');

const historiqueSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur est obligatoire"],
    },
    action: {
      type: String,
      required: [true, "L'action est obligatoire"],
      enum: [
        'CREATION',
        'MODIFICATION',
        'SUPPRESSION',
        'CONNEXION',
        'CHANGEMENT_STATUT',
        'CHANGEMENT_ROLE',
        'ECHEC_CONNEXION',
        'VERROUILLAGE',
        'DEVERROUILLAGE',
        'INSCRIPTION',
        'VERIFICATION_EMAIL',
        'DEMANDE_REINITIALISATION',
        'REINITIALISATION_MDP',
      ],
    },
    description: { type: String, trim: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Après un save(), isNew vaut déjà false : on mémorise donc ici s'il s'agit d'une création.
historiqueSchema.pre('save', function () {
  this.$locals.estNouveau = this.isNew;
});

// Archivage Discord de chaque NOUVELLE entrée (les modifications d'entrées existantes sont ignorées).
// Volontairement sans await : l'envoi ne retarde ni ne fait jamais échouer la requête.
historiqueSchema.post('save', function (doc) {
  if (doc.$locals.estNouveau) archiverHistorique(doc);
});

module.exports = mongoose.model('Historique', historiqueSchema);
