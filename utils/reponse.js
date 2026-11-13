const mongoose = require('mongoose');

// Erreur de paramètre de requête invalide : renvoyée au client en 400.
class ErreurRequete extends Error {
  constructor(message) {
    super(message);
    this.name = 'ErreurRequete';
  }
}

// `extra` permet d'ajouter des clés au niveau racine (ex : { pagination }).
const reponse = (res, status, message, data = null, extra = {}) =>
  res.status(status).json({ success: status < 400, message, data, ...extra });

// Ne garde que les champs autorisés présents dans le body.
const extraireChamps = (body = {}, champsAutorises) =>
  champsAutorises.reduce((champs, nom) => {
    if (body[nom] !== undefined) champs[nom] = body[nom];
    return champs;
  }, {});

const gererErreur = (res, err) => {
  if (err instanceof ErreurRequete) {
    return reponse(res, 400, err.message);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return reponse(
      res,
      400,
      'Erreur de validation',
      Object.values(err.errors).map((e) => e.message)
    );
  }
  if (err.code === 11000) {
    return reponse(res, 409, 'Cet email est déjà utilisé');
  }
  console.error(err);
  return reponse(res, 500, 'Erreur interne du serveur');
};

module.exports = { ErreurRequete, reponse, extraireChamps, gererErreur };
