const mongoose = require('mongoose');
const User = require('../models/user.model');
const Historique = require('../models/historique.model');
const { reponse, extraireChamps, gererErreur } = require('../utils/reponse');
const {
  filtreEnum,
  filtreRecherche,
  pagination,
  tri,
  infosPagination,
} = require('../utils/query');

// Seuls ces champs peuvent être écrits par le client (_id, createdAt, updatedAt exclus).
const CHAMPS_MODIFIABLES = ['nom', 'prenom', 'email', 'motDePasse', 'telephone', 'role', 'statut', 'emailVerifie'];
const CHAMPS_TRI = ['nom', 'prenom', 'email', 'createdAt'];
const ROLES = User.schema.path('role').enumValues;
const STATUTS = User.schema.path('statut').enumValues;

// Enregistre dans l'historique les actions faites par un admin. Un échec d'écriture de l'historique
// est loggué mais ne fait pas échouer la requête : l'opération sur l'utilisateur est déjà effectuée.
// Les descriptions ne contiennent jamais de mot de passe (noms de champs et statuts/rôles seulement).
const tracer = async (userId, entrees) => {
  try {
    for (const { action, description } of entrees) {
      await Historique.create({ user: userId, action, description });
    }
  } catch (err) {
    console.error("Écriture de l'historique impossible :", err.message);
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await new User(extraireChamps(req.body, CHAMPS_MODIFIABLES)).save();
    await tracer(user._id, [
      { action: 'CREATION', description: `Compte créé par ${req.user.email} (rôle ${user.role}, statut ${user.statut})` },
    ]);
    return reponse(res, 201, 'Utilisateur créé avec succès', user);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, statut } = req.query;
    const filtre = {};

    const recherche = search !== undefined && filtreRecherche(search, ['nom', 'prenom', 'email']);
    if (recherche) Object.assign(filtre, recherche);
    if (role !== undefined) filtre.role = filtreEnum(role, 'role', ROLES);
    if (statut !== undefined) filtre.statut = filtreEnum(statut, 'statut', STATUTS);

    const { page, limit, skip } = pagination(req.query);
    const ordre = tri(req.query, CHAMPS_TRI, 'createdAt');

    const [users, total] = await Promise.all([
      User.find(filtre).sort(ordre).skip(skip).limit(limit),
      User.countDocuments(filtre),
    ]);

    return reponse(res, 200, 'Liste des utilisateurs', users, {
      pagination: infosPagination(total, page, limit),
    });
  } catch (err) {
    return gererErreur(res, err);
  }
};

// Transforme [{ _id: 'admin', total: 2 }] en { admin: 2 } en complétant les valeurs absentes par 0.
const repartition = (groupes, valeurs) =>
  valeurs.reduce(
    (acc, valeur) => ({ ...acc, [valeur]: groupes.find((g) => g._id === valeur)?.total ?? 0 }),
    {}
  );

exports.getUserStats = async (req, res) => {
  try {
    const [stats] = await User.aggregate([
      {
        $facet: {
          total: [{ $count: 'total' }],
          parRole: [{ $group: { _id: '$role', total: { $sum: 1 } } }],
          parStatut: [{ $group: { _id: '$statut', total: { $sum: 1 } } }],
          parMois: [
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    return reponse(res, 200, 'Statistiques des utilisateurs', {
      total: stats.total[0]?.total ?? 0,
      parRole: repartition(stats.parRole, ROLES),
      parStatut: repartition(stats.parStatut, STATUTS),
      inscriptionsParMois: stats.parMois.map((m) => ({ mois: m._id, total: m.total })),
    });
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return reponse(res, 400, 'Identifiant invalide');

    const user = await User.findById(id);
    if (!user) return reponse(res, 404, 'Utilisateur introuvable');

    return reponse(res, 200, 'Utilisateur trouvé', user);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return reponse(res, 400, 'Identifiant invalide');

    const user = await User.findById(id);
    if (!user) return reponse(res, 404, 'Utilisateur introuvable');

    const ancien = { role: user.role, statut: user.statut };

    // findById + save() : déclenche la validation et le hash bcrypt du mot de passe.
    user.set(extraireChamps(req.body, CHAMPS_MODIFIABLES));
    const modifies = CHAMPS_MODIFIABLES.filter((champ) => user.isModified(champ)); // avant save()
    await user.save();

    const par = req.user.email;
    const entrees = [];
    if (modifies.length) {
      entrees.push({ action: 'MODIFICATION', description: `Champs modifiés par ${par} : ${modifies.join(', ')}` });
    }
    if (modifies.includes('statut')) {
      entrees.push({ action: 'CHANGEMENT_STATUT', description: `Statut modifié par ${par} : ${ancien.statut} → ${user.statut}` });
    }
    if (modifies.includes('role')) {
      entrees.push({ action: 'CHANGEMENT_ROLE', description: `Rôle modifié par ${par} : ${ancien.role} → ${user.role}` });
    }
    await tracer(user._id, entrees);

    return reponse(res, 200, 'Utilisateur modifié avec succès', user);
  } catch (err) {
    return gererErreur(res, err);
  }
};

// Déverrouillage manuel (route réservée aux admins).
exports.deverrouillerUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return reponse(res, 400, 'Identifiant invalide');

    const user = await User.findByIdAndUpdate(
      id,
      { tentativesEchouees: 0, verrouilleJusqua: null },
      { new: true }
    );
    if (!user) return reponse(res, 404, 'Utilisateur introuvable');

    await Historique.create({
      user: user._id,
      action: 'DEVERROUILLAGE',
      description: `Compte déverrouillé par ${req.user.email}`,
    });

    return reponse(res, 200, 'Compte déverrouillé avec succès', user);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return reponse(res, 400, 'Identifiant invalide');

    // Un admin ne peut pas supprimer son propre compte : l'entrée SUPPRESSION serait orpheline
    // (elle est rattachée au compte de l'admin) et la plateforme pourrait se retrouver sans admin.
    if (id === req.user.id) {
      return reponse(res, 400, 'Un administrateur ne peut pas supprimer son propre compte');
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return reponse(res, 404, 'Utilisateur introuvable');

    // Suppression en cascade des historiques de l'utilisateur.
    const { deletedCount } = await Historique.deleteMany({ user: id });

    // Trace conservée sur le compte de l'admin (celle du compte supprimé a disparu avec la cascade).
    await tracer(req.user._id, [
      { action: 'SUPPRESSION', description: `A supprimé ${user.prenom} ${user.nom} (${user.email})` },
    ]);

    return reponse(
      res,
      200,
      `Utilisateur supprimé avec succès (${deletedCount} historique(s) supprimé(s))`
    );
  } catch (err) {
    return gererErreur(res, err);
  }
};
