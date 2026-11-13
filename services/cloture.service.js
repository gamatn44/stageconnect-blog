const Offre = require('../models/Offre');
const { EVENTS, publish, offreSummary } = require('../events/publisher');

/** Clôture automatiquement toutes les offres ouvertes dont la date limite est dépassée. */
async function cloturerExpirees(now = new Date()) {
  const expirees = await Offre.find({ statut: 'ouverte', dateLimite: { $ne: null, $lte: now } }).lean();
  if (!expirees.length) return 0;

  await Offre.updateMany(
    { _id: { $in: expirees.map((o) => o._id) }, statut: 'ouverte' },
    { $set: { statut: 'cloturee', dateCloture: now, raisonCloture: 'date_limite' } }
  );
  expirees.forEach((o) =>
    publish(EVENTS.OFFRE_CLOTUREE, { ...offreSummary({ ...o, statut: 'cloturee' }), raison: 'date_limite' })
  );
  return expirees.length;
}

module.exports = { cloturerExpirees };
