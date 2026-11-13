const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { jwtSecret } = require('../config/auth.config');
const { reponse, gererErreur } = require('../utils/reponse');

// Vérifie le token JWT (en-tête Authorization: Bearer <token>) et charge req.user.
exports.authentifier = async (req, res, next) => {
  try {
    const [schema, token] = (req.headers.authorization || '').split(' ');
    if (schema !== 'Bearer' || !token) return reponse(res, 401, 'Authentification requise');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (err) {
      return reponse(res, 401, 'Token invalide ou expiré');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.statut !== 'actif') return reponse(res, 401, 'Token invalide ou expiré');

    // Un mot de passe modifié/réinitialisé déconnecte toutes les sessions antérieures.
    // iatMs (ms) est plus précis que iat (secondes) : un token émis juste après le changement reste valide.
    if (user.motDePasseModifieLe) {
      const emisLe = payload.iatMs ?? (payload.iat ?? 0) * 1000;
      if (emisLe < user.motDePasseModifieLe.getTime()) return reponse(res, 401, 'Token invalide ou expiré');
    }

    req.user = user;
    return next();
  } catch (err) {
    return gererErreur(res, err);
  }
};

// À placer après authentifier : limite l'accès à certains rôles.
exports.exigerRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) return reponse(res, 403, 'Accès refusé : droits insuffisants');
    return next();
  };
