const Offre = require('../models/Offre');
const Domaine = require('../models/Domaine');
const ApiError = require('../utils/ApiError');
const { buildFilter, buildSort, buildPagination } = require('../utils/query');
const { EVENTS, publish, offreSummary } = require('../events/publisher');
const dup = require('./duplicate.service');

async function assertDomaine(id) {
  const d = await Domaine.findOne({ _id: id, actif: true });
  if (!d) throw new ApiError(400, 'Domaine inexistant ou désactivé');
  return d;
}

/** Règles de visibilité : seuls admin/propriétaire voient les offres clôturées. */
function scopeQuery(query, user) {
  const q = { ...query };
  const isOwnerQuery = user.role === 'entreprise' && q.entrepriseId === user.id;
  if (user.role !== 'admin' && !isOwnerQuery) q.statut = 'ouverte';
  return q;
}

async function list(query, user) {
  const q = scopeQuery(query, user);
  const filter = buildFilter(q);
  const sort = buildSort(q);
  const { page, limit, skip } = buildPagination(q);
  const projection = q.q ? { score: { $meta: 'textScore' } } : undefined;

  const [data, total] = await Promise.all([
    Offre.find(filter, projection).populate('domaine', 'nom').sort(sort).skip(skip).limit(limit),
    Offre.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(total / limit) || 1;
  return { data, pagination: { page, limit, total, totalPages, hasNext: page < totalPages } };
}

async function getById(id) {
  const o = await Offre.findById(id).populate('domaine', 'nom');
  if (!o) throw new ApiError(404, 'Offre introuvable');
  return o;
}

async function create(data, user, { force = false } = {}) {
  await assertDomaine(data.domaine);

  const owner = user.role === 'admin'
    ? { entrepriseId: data.entrepriseId || user.id, entrepriseNom: data.entrepriseNom || user.nom }  
      : { entrepriseId: user.id, entrepriseNom: user.nom || data.entrepriseNom };
  if (!owner.entrepriseId && !owner.entrepriseNom) throw new ApiError(400, "entrepriseId ou entrepriseNom requis");

  const { entrepriseId: _i, entrepriseNom: _n, ...fields } = data;
  const payload = { ...fields, ...owner, source: 'interne' };

  // --- détection de doublons ---
  const doublons = await dup.findDuplicates({ ...payload });
  if (doublons.length) {
    dup.notifyDuplicates({ entrepriseId: owner.entrepriseId, email: user.email, titre: payload.titre, doublons });
    if (!force) {
      throw new ApiError(409, 'Offre similaire déjà publiée. Ajoutez ?force=true pour publier quand même.', doublons);
    }
    payload.doublonPotentiel = true;
  }

  const offre = await Offre.create({ ...payload, ...dup.derive(payload) });
  publish(EVENTS.OFFRE_CREEE, offreSummary(offre));
  return { offre, doublons };
}

async function assertCanModify(offre, user) {
  if (user.role !== 'admin' && offre.entrepriseId !== user.id) {
    throw new ApiError(403, "Vous n'êtes pas propriétaire de cette offre");
  }
}

async function update(id, data, user) {
  const offre = await Offre.findById(id);
  if (!offre) throw new ApiError(404, 'Offre introuvable');
  await assertCanModify(offre, user);
  if (offre.statut === 'cloturee' && user.role !== 'admin') {
    throw new ApiError(409, 'Une offre clôturée ne peut plus être modifiée');
  }
  if (data.domaine) await assertDomaine(data.domaine);

  Object.assign(offre, data);
  Object.assign(offre, dup.derive(offre));
  await offre.save();
  publish(EVENTS.OFFRE_MODIFIEE, offreSummary(offre));
  return offre;
}

async function cloturer(id, user) {
  const offre = await Offre.findById(id);
  if (!offre) throw new ApiError(404, 'Offre introuvable');
  await assertCanModify(offre, user);
  if (offre.statut === 'cloturee') throw new ApiError(409, 'Offre déjà clôturée');
  offre.statut = 'cloturee';
  offre.dateCloture = new Date();
  offre.raisonCloture = 'manuelle';
  await offre.save();
  publish(EVENTS.OFFRE_CLOTUREE, { ...offreSummary(offre), raison: 'manuelle' });
  return offre;
}

async function remove(id, user) {
  const offre = await Offre.findById(id);
  if (!offre) throw new ApiError(404, 'Offre introuvable');
  await assertCanModify(offre, user);
  await offre.deleteOne();
  publish(EVENTS.OFFRE_SUPPRIMEE, { id: String(offre._id), entrepriseId: offre.entrepriseId });
}

/** Utilisé par le service Candidatures (route interne) : l'offre est-elle ouverte ? */
async function verification(id) {
  const o = await Offre.findById(id).select('titre statut dateLimite entrepriseId').lean();
  if (!o) return { found: false, ouverte: false };
  const expiree = o.dateLimite && new Date(o.dateLimite) <= new Date();
  return {
    found: true,
    ouverte: o.statut === 'ouverte' && !expiree,
    statut: expiree ? 'cloturee' : o.statut,
    entrepriseId: o.entrepriseId,
    titre: o.titre,
    dateLimite: o.dateLimite,
  };
}

module.exports = { list, getById, create, update, cloturer, remove, verification };
