const mongoose = require('mongoose');
const Historique = require('../models/historique.model');
const User = require('../models/user.model');
const { ErreurRequete, reponse, extraireChamps, gererErreur } = require('../utils/reponse');
const {
  filtreEnum,
  filtreObjectId,
  filtreRecherche,
  pagination,
  tri,
  parserDate,
  infosPagination,
} = require('../utils/query');

const CHAMPS_MODIFIABLES = ['user', 'action', 'description', 'date'];
const CHAMPS_TRI = ['date', 'action'];
const ACTIONS = Historique.schema.path('action').enumValues;
const POPULATE_USER = 'nom prenom email role';

// Vérifie que l'id utilisateur est valide (400) et que l'utilisateur existe (404).
// Retourne une réponse d'erreur si le contrôle échoue, sinon null.
const verifierUser = async (res, userId) => {
  if (!mongoose.isValidObjectId(userId)) return reponse(res, 400, 'Identifiant utilisateur invalide');
  if (!(await User.exists({ _id: userId }))) return reponse(res, 404, 'Utilisateur introuvable');
  return null;
};

exports.createHistorique = async (req, res) => {
  try {
    const champs = extraireChamps(req.body, CHAMPS_MODIFIABLES);

    const erreur = await verifierUser(res, champs.user);
    if (erreur) return erreur;

    const historique = await new Historique(champs).save();
    return reponse(res, 201, 'Historique créé avec succès', historique);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.getAllHistoriques = async (req, res) => {
  try {
    const { search, action, user, dateDebut, dateFin } = req.query;
    const filtre = {};

    const recherche = search !== undefined && filtreRecherche(search, ['description']);
    if (recherche) Object.assign(filtre, recherche);
    if (action !== undefined) filtre.action = filtreEnum(action, 'action', ACTIONS);
    if (user !== undefined) filtre.user = filtreObjectId(user, 'user');

    if (dateDebut !== undefined || dateFin !== undefined) {
      const debut = dateDebut !== undefined ? parserDate(dateDebut, 'dateDebut') : null;
      const fin = dateFin !== undefined ? parserDate(dateFin, 'dateFin', true) : null;
      if (debut && fin && debut > fin) {
        throw new ErreurRequete("'dateDebut' doit être antérieure ou égale à 'dateFin'");
      }
      filtre.date = { ...(debut && { $gte: debut }), ...(fin && { $lte: fin }) };
    }

    const { page, limit, skip } = pagination(req.query);
    const ordre = tri(req.query, CHAMPS_TRI, 'date');

    const [historiques, total] = await Promise.all([
      Historique.find(filtre).sort(ordre).skip(skip).limit(limit).populate('user', POPULATE_USER),
      Historique.countDocuments(filtre),
    ]);

    return reponse(res, 200, 'Liste des historiques', historiques, {
      pagination: infosPagination(total, page, limit),
    });
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.getHistoriqueStats = async (req, res) => {
  try {
    const [stats] = await Historique.aggregate([
      {
        $facet: {
          total: [{ $count: 'total' }],
          parAction: [{ $group: { _id: '$action', total: { $sum: 1 } } }],
          topUtilisateurs: [
            { $group: { _id: '$user', nombreActions: { $sum: 1 } } },
            { $sort: { nombreActions: -1, _id: 1 } },
            { $limit: 5 },
            { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
              $project: {
                _id: 0,
                userId: '$_id',
                nom: '$user.nom',
                prenom: '$user.prenom',
                email: '$user.email',
                nombreActions: 1,
              },
            },
          ],
        },
      },
    ]);

    return reponse(res, 200, 'Statistiques des historiques', {
      total: stats.total[0]?.total ?? 0,
      parAction: ACTIONS.reduce(
        (acc, a) => ({ ...acc, [a]: stats.parAction.find((g) => g._id === a)?.total ?? 0 }),
        {}
      ),
      topUtilisateurs: stats.topUtilisateurs,
    });
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.getHistoriqueById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return reponse(res, 400, 'Identifiant invalide');

    const historique = await Historique.findById(id).populate('user', POPULATE_USER);
    if (!historique) return reponse(res, 404, 'Historique introuvable');

    return reponse(res, 200, 'Historique trouvé', historique);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.updateHistorique = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return reponse(res, 400, 'Identifiant invalide');

    const historique = await Historique.findById(id);
    if (!historique) return reponse(res, 404, 'Historique introuvable');

    const champs = extraireChamps(req.body, CHAMPS_MODIFIABLES);
    if (champs.user !== undefined) {
      const erreur = await verifierUser(res, champs.user);
      if (erreur) return erreur;
    }

    historique.set(champs);
    await historique.save();
    await historique.populate('user', POPULATE_USER);

    return reponse(res, 200, 'Historique modifié avec succès', historique);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.deleteHistorique = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return reponse(res, 400, 'Identifiant invalide');

    const historique = await Historique.findByIdAndDelete(id);
    if (!historique) return reponse(res, 404, 'Historique introuvable');

    return reponse(res, 200, 'Historique supprimé avec succès');
  } catch (err) {
    return gererErreur(res, err);
  }
};
