const Offre = require('../models/Offre');
const env = require('../config/env');
const { EVENTS, publish } = require('../events/publisher');
const { similarity, fingerprint, entrepriseKey } = require('../utils/similarity');

/** Champs dérivés à calculer avant tout enregistrement. */
function derive(o) {
  return {
    entrepriseKey: entrepriseKey(o),
    fingerprint: fingerprint(o),
  };
}

/**
 * Cherche les offres ouvertes de la MÊME entreprise et du MÊME domaine
 * qui ressemblent à `candidate` (empreinte identique ou similarité >= seuil).
 */
async function findDuplicates(candidate, { excludeId } = {}) {
  const key = entrepriseKey(candidate);
  const fp = fingerprint(candidate);
  const filter = { entrepriseKey: key, domaine: candidate.domaine, statut: 'ouverte' };
  if (excludeId) filter._id = { $ne: excludeId };

  const others = await Offre.find(filter).select('titre description ville fingerprint').limit(200).lean();
  return others
    .map((o) => ({
      id: String(o._id),
      titre: o.titre,
      ville: o.ville,
      score: o.fingerprint === fp ? 1 : similarity(candidate, o),
    }))
    .filter((d) => d.score >= env.duplicateThreshold)
    .sort((a, b) => b.score - a.score);
}

/** Message envoyé à l'entreprise via RabbitMQ -> service Notifications (e-mail). */
function notifyDuplicates({ entrepriseId, email, titre, offreId, doublons }) {
  publish(EVENTS.DOUBLON_DETECTE, {
    entrepriseId,
    destinataireEmail: email,
    offreId: offreId ? String(offreId) : null,
    titre,
    doublons,
    message: `Votre offre « ${titre} » ressemble à ${doublons.length} offre(s) déjà publiée(s).`,
  });
}

/** Scan global (cron / admin) : détecte les paires de doublons entre offres ouvertes d'une même entreprise. */
async function scanAll() {
  const offres = await Offre.find({ statut: 'ouverte', entrepriseKey: { $exists: true } })
    .sort('createdAt')
    .select('titre description domaine entrepriseId entrepriseNom entrepriseKey fingerprint doublonPotentiel')
    .lean();

  const groups = new Map();
  offres.forEach((o) => {
    const k = `${o.entrepriseKey}|${o.domaine}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  });

  const toFlag = new Set();
  let notified = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const pairsByTarget = new Map(); // offre la plus récente -> originaux similaires
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i]; const b = list[j];
        const score = a.fingerprint === b.fingerprint ? 1 : similarity(a, b);
        if (score >= env.duplicateThreshold) {
          if (!pairsByTarget.has(b._id)) pairsByTarget.set(b._id, { offre: b, doublons: [] });
          pairsByTarget.get(b._id).doublons.push({ id: String(a._id), titre: a.titre, score });
        }
      }
    }
    for (const { offre, doublons } of pairsByTarget.values()) {
      if (!offre.doublonPotentiel) { // ne notifier qu'une seule fois
        toFlag.add(offre._id);
        notifyDuplicates({ entrepriseId: offre.entrepriseId, titre: offre.titre, offreId: offre._id, doublons });
        notified += 1;
      }
    }
  }
  if (toFlag.size) await Offre.updateMany({ _id: { $in: [...toFlag] } }, { $set: { doublonPotentiel: true } });
  return { scanned: offres.length, newDuplicates: notified };
}

/** Liste des offres marquées comme doublons potentiels. */
const listFlagged = (scope = {}) =>
  Offre.find({ doublonPotentiel: true, ...scope }).populate('domaine', 'nom').sort('-createdAt');

module.exports = { derive, findDuplicates, notifyDuplicates, scanAll, listFlagged };
