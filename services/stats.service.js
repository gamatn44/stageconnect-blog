const Offre = require('../models/Offre');
const Domaine = require('../models/Domaine');

const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id ?? 'inconnu', x.count]));

/** scope = {} pour l'admin, { entrepriseId } pour une entreprise */
async function getStats(scope = {}) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 864e5);
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const group = (field) => [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }];

  const [r] = await Offre.aggregate([
    { $match: scope },
    {
      $facet: {
        total: [{ $count: 'n' }],
        parStatut: group('statut'),
        parType: group('typeStage'),
        parSource: group('source'),
        parVille: [...group('ville'), { $limit: 10 }],
        parDomaine: [
          ...group('domaine'),
          { $lookup: { from: Domaine.collection.name, localField: '_id', foreignField: '_id', as: 'd' } },
          { $project: { _id: 0, domaine: { $arrayElemAt: ['$d.nom', 0] }, count: 1 } },
        ],
        dureeMoyenne: [{ $group: { _id: null, avg: { $avg: '$dureeMois' } } }],
        parMois: [
          { $match: { createdAt: { $gte: oneYearAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        expirentSous7Jours: [{ $match: { statut: 'ouverte', dateLimite: { $gte: now, $lte: in7 } } }, { $count: 'n' }],
        doublonsPotentiels: [{ $match: { doublonPotentiel: true } }, { $count: 'n' }],
      },
    },
  ]);

  return {
    total: r.total[0]?.n || 0,
    parStatut: toMap(r.parStatut),
    parType: toMap(r.parType),
    parSource: toMap(r.parSource),
    parVille: toMap(r.parVille),
    parDomaine: Object.fromEntries(r.parDomaine.map((x) => [x.domaine || 'inconnu', x.count])),
    dureeMoyenneMois: r.dureeMoyenne[0] ? Number(r.dureeMoyenne[0].avg.toFixed(1)) : 0,
    parMois: toMap(r.parMois),
    expirentSous7Jours: r.expirentSous7Jours[0]?.n || 0,
    doublonsPotentiels: r.doublonsPotentiels[0]?.n || 0,
  };
}

module.exports = { getStats };
