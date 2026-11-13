const Offre = require('../models/Offre');
const Domaine = require('../models/Domaine');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { resolve } = require('../providers');
const { isInternship } = require('../providers/util');
const { fingerprint, entrepriseKey } = require('../utils/similarity');
const { csv } = require('../utils/query');
const { EVENTS, publish, offreSummary } = require('../events/publisher');

function guessType(titre) {
  const t = titre.toLowerCase();
  if (/\bpfe\b/.test(t)) return 'PFE';
  if (/\bpfa\b/.test(t)) return 'PFA';
  if (/été|summer/.test(t)) return 'ETE';
  return 'AUTRE';
}

/** "Shopping" : cherche des offres externes pour un domaine (sans rien enregistrer). */
async function shop({ domaine, providers, limit = 20, internOnly = true }) {
  const dom = await Domaine.findById(domaine);
  if (!dom) throw new ApiError(404, 'Domaine introuvable');
  const keywords = (dom.motsCles.length ? dom.motsCles : [dom.nom]).slice(0, 3);
  const selected = resolve(providers ? csv(providers) : null);
  if (!selected.length) throw new ApiError(400, 'Aucun provider valide');

  const tasks = selected.flatMap((p) => keywords.map((keyword) =>
    p.search({ keyword, limit }).catch((e) => {
      console.warn(`[import] ${p.name}/${keyword} a échoué: ${e.message}`);
      return [];
    })));
  const results = (await Promise.all(tasks)).flat();

  // dédoublonnage dans le lot
  const seen = new Set();
  const items = [];
  for (const r of results) {
    if (!r.titre || !r.entrepriseNom) continue;
    if (internOnly && !isInternship(r.titre)) continue;
    const fp = fingerprint({ titre: r.titre, ville: r.ville, entrepriseNom: r.entrepriseNom });
    if (seen.has(fp)) continue;
    seen.add(fp);
    items.push({ ...r, fingerprint: fp });
  }
  return { domaine: dom, items: items.slice(0, limit), keywords, providers: selected.map((p) => p.name) };
}

/** Importe en base les offres trouvées (ignore celles déjà connues : externalId ou empreinte). */
async function importOffers(opts) {
  const { domaine, items } = await shop(opts);
  if (!items.length) return { trouvees: 0, importees: 0, ignorees: 0 };

  const known = await Offre.find({
    $or: [{ externalId: { $in: items.map((i) => i.externalId) } }, { fingerprint: { $in: items.map((i) => i.fingerprint) } }],
  }).select('externalId fingerprint').lean();
  const knownIds = new Set(known.map((k) => k.externalId));
  const knownFps = new Set(known.map((k) => k.fingerprint));

  const dateLimite = new Date(Date.now() + env.importTtlDays * 864e5); // l'auto-clôture nettoiera les offres périmées
  const docs = items
    .filter((i) => !knownIds.has(i.externalId) && !knownFps.has(i.fingerprint))
    .map((i) => ({
      titre: i.titre.slice(0, 150),
      description: i.description || i.titre,
      domaine: domaine._id,
      ville: i.ville || 'N/A',
      dureeMois: 3,
      typeStage: guessType(i.titre),
      competences: i.competences || [],
      entrepriseNom: i.entrepriseNom,
      entrepriseKey: entrepriseKey({ entrepriseNom: i.entrepriseNom }),
      fingerprint: i.fingerprint,
      source: 'externe',
      sourceName: i.sourceName,
      externalId: i.externalId,
      urlExterne: i.urlExterne,
      dateLimite,
    }));

  let created = [];
  if (docs.length) created = await Offre.insertMany(docs, { ordered: false }).catch((e) => e.insertedDocs || []);
  created.forEach((o) => publish(EVENTS.OFFRE_CREEE, offreSummary(o)));
  return { trouvees: items.length, importees: created.length, ignorees: items.length - created.length };
}

/** Import planifié de tous les domaines actifs. */
async function importAllDomains() {
  const domaines = await Domaine.find({ actif: true });
  const out = {};
  for (const d of domaines) {
    try { out[d.nom] = await importOffers({ domaine: String(d._id), limit: 20, internOnly: true }); }
    catch (e) { out[d.nom] = { erreur: e.message }; }
  }
  return out;
}

module.exports = { shop, importOffers, importAllDomains };
