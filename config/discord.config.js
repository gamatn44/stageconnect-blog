require('dotenv').config({ quiet: true });

// Couleurs des embeds Discord (entiers RGB).
const COULEURS = {
  rouge: 0xe74c3c,
  orange: 0xe67e22,
  vert: 0x2ecc71,
  bleu: 0x3498db,
};

module.exports = {
  // URL du webhook . Vide = archivage désactivé, log console seulement.
  webhookUrl: (process.env.DISCORD_WEBHOOK_URL || '').trim(),

  // Délai maximum d'un envoi : au-delà, on abandonne sans impact sur la requête.
  timeoutMs: 5000,

  // Actions de l'historique archivées sur Discord (liste configurable).
  actionsArchivees: [
    'INSCRIPTION',
    'VERIFICATION_EMAIL',
    'VERROUILLAGE',
    'DEVERROUILLAGE',
    'DEMANDE_REINITIALISATION',
    'REINITIALISATION_MDP',
    'SUPPRESSION',
    'CHANGEMENT_STATUT',
    'CHANGEMENT_ROLE',
  ],

  // Couleur selon la gravité (bleu par défaut).
  couleurs: COULEURS,
  couleurParAction: {
    VERROUILLAGE: COULEURS.rouge,
    SUPPRESSION: COULEURS.rouge,
    DEMANDE_REINITIALISATION: COULEURS.orange,
    REINITIALISATION_MDP: COULEURS.orange,
    CHANGEMENT_STATUT: COULEURS.orange,
    CHANGEMENT_ROLE: COULEURS.orange,
    INSCRIPTION: COULEURS.vert,
    VERIFICATION_EMAIL: COULEURS.vert,
  },
};
