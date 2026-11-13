const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Historique = require('../models/historique.model');
const config = require('../config/auth.config');
const mailConfig = require('../config/mail.config');
const { reponse, extraireChamps, gererErreur } = require('../utils/reponse');
const {
  envoyerEmailVerification,
  envoyerEmailReinitialisation,
  envoyerEmailConfirmationMotDePasse,
} = require('../utils/mail');

const MESSAGE_IDENTIFIANTS = 'Email ou mot de passe incorrect';
const MESSAGE_RENVOI =
  "Si un compte non vérifié existe pour cet email, un nouvel email de vérification vient d'être envoyé";

const MESSAGE_MDP_OUBLIE =
  "Si un compte existe pour cet email, un code de réinitialisation vient d'être envoyé";
const MESSAGE_CODE_INVALIDE = 'Code invalide ou expiré. Demandez un nouveau code si nécessaire';

// Seuls ces champs sont acceptés à l'inscription (le statut et les autres champs sont ignorés).
const CHAMPS_INSCRIPTION = ['nom', 'prenom', 'email', 'motDePasse', 'telephone', 'role'];

// Hash factice : on compare toujours un mot de passe, même si l'email est inconnu,
// pour que le temps de réponse ne révèle pas l'existence du compte.
const HASH_FACTICE = bcrypt.hashSync('mot-de-passe-factice', 10);

const journaliser = (user, action, description) =>
  Historique.create({ user: user._id, action, description });

exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body || {};
    if (typeof email !== 'string' || typeof motDePasse !== 'string' || !email.trim() || !motDePasse) {
      return reponse(res, 400, 'Email et mot de passe obligatoires');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+motDePasse');
    if (!user) {
      await bcrypt.compare(motDePasse, HASH_FACTICE);
      return reponse(res, 401, MESSAGE_IDENTIFIANTS);
    }

    // Compte verrouillé : refus même si le mot de passe est correct.
    const maintenant = new Date();
    if (user.verrouilleJusqua) {
      if (user.verrouilleJusqua > maintenant) {
        const secondes = Math.ceil((user.verrouilleJusqua - maintenant) / 1000);
        const minutes = Math.ceil(secondes / 60);
        res.set('Retry-After', String(secondes));
        return reponse(res, 423, `Compte verrouillé. Réessayez dans ${minutes} minute(s)`, {
          verrouilleJusqua: user.verrouilleJusqua,
          tempsRestantSecondes: secondes,
        });
      }
      // Verrouillage expiré : le compteur repart de zéro.
      user.tentativesEchouees = 0;
      user.verrouilleJusqua = null;
      await User.updateOne({ _id: user._id }, { tentativesEchouees: 0, verrouilleJusqua: null });
    }

    if (!(await user.verifierMotDePasse(motDePasse))) {
      // Incrément atomique pour éviter les pertes en cas de requêtes simultanées.
      const { tentativesEchouees } = await User.findByIdAndUpdate(
        user._id,
        { $inc: { tentativesEchouees: 1 } },
        { new: true }
      );
      await journaliser(user, 'ECHEC_CONNEXION', `Échec de connexion (tentative ${tentativesEchouees}/${config.maxTentatives})`);

      if (tentativesEchouees >= config.maxTentatives) {
        const verrouilleJusqua = new Date(Date.now() + config.dureeVerrouillageMinutes * 60 * 1000);
        await User.updateOne({ _id: user._id }, { verrouilleJusqua });
        await journaliser(
          user,
          'VERROUILLAGE',
          `Compte verrouillé ${config.dureeVerrouillageMinutes} minute(s) après ${config.maxTentatives} échecs`
        );
      }
      return reponse(res, 401, MESSAGE_IDENTIFIANTS);
    }

    // Mot de passe correct, mais compte désactivé ou bloqué.
    if (user.statut !== 'actif') {
      return reponse(res, 403, `Compte ${user.statut} : connexion refusée`);
    }

    if (!user.emailVerifie) {
      return reponse(res, 403, 'Email non vérifié');
    }

    await User.updateOne({ _id: user._id }, { tentativesEchouees: 0, verrouilleJusqua: null });
    user.tentativesEchouees = 0;
    user.verrouilleJusqua = null;
    await journaliser(user, 'CONNEXION', 'Connexion réussie');

    const token = jwt.sign({ sub: user.id, role: user.role, iatMs: Date.now() }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    return reponse(res, 200, 'Connexion réussie', { token, user });
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.register = async (req, res) => {
  try {
    const champs = extraireChamps(req.body, CHAMPS_INSCRIPTION);

    if (champs.role !== undefined && !config.rolesInscription.includes(champs.role)) {
      return reponse(res, 400, `Rôle invalide : ${config.rolesInscription.join(' ou ')} uniquement`);
    }

    const user = new User(champs);
    const token = user.genererTokenVerification();
    await user.save();
    await journaliser(user, 'INSCRIPTION', 'Inscription du compte');

    const envoi = await envoyerEmailVerification(user, token);

    let message = 'Compte créé. Un email de vérification vous a été envoyé';
    if (envoi.modeConsole) {
      message = 'Compte créé. Mode développement : le lien de vérification est affiché dans la console du serveur';
    } else if (!envoi.envoye) {
      message =
        "Compte créé, mais l'envoi de l'email de vérification a échoué. Utilisez /api/auth/renvoyer-verification";
    }

    return reponse(res, 201, message, {
      user,
      emailEnvoye: envoi.envoye,
      // Uniquement en mode développement (MAIL_USER vide) : permet de tester sans boîte mail.
      ...(envoi.modeConsole && { lienVerificationDev: envoi.lien }),
    });
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.verifierEmail = async (req, res) => {
  try {
    const hash = User.hashToken(req.params.token);

    // Atomique : le token est à usage unique et refusé s'il a expiré.
    const user = await User.findOneAndUpdate(
      { tokenVerification: hash, tokenVerificationExpire: { $gt: new Date() } },
      { $set: { emailVerifie: true }, $unset: { tokenVerification: 1, tokenVerificationExpire: 1 } },
      { new: true }
    );
    if (!user) return reponse(res, 400, 'Lien de vérification invalide ou expiré');

    await journaliser(user, 'VERIFICATION_EMAIL', 'Adresse email vérifiée');
    return reponse(res, 200, 'Email vérifié avec succès. Vous pouvez maintenant vous connecter', user);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.renvoyerVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) return reponse(res, 400, "L'email est obligatoire");

    let lienVerificationDev;
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user && !user.emailVerifie) {
      const token = user.genererTokenVerification();
      await user.save();
      const envoi = await envoyerEmailVerification(user, token);
      if (envoi.modeConsole) lienVerificationDev = envoi.lien;
    }

    // Réponse identique que l'email soit inconnu, déjà vérifié ou non (aucune fuite d'information).
    return reponse(res, 200, MESSAGE_RENVOI, lienVerificationDev ? { lienVerificationDev } : null);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.motDePasseOublie = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) return reponse(res, 400, "L'email est obligatoire");

    let codeDev;
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) {
      const code = user.genererCodeReinitialisation();
      await user.save();
      await journaliser(user, 'DEMANDE_REINITIALISATION', 'Demande de réinitialisation du mot de passe');

      // Sans await : le temps de réponse ne dépend pas de l'envoi du mail (donc ne révèle pas si le compte existe).
      // envoyerEmailReinitialisation ne lève jamais d'erreur.
      envoyerEmailReinitialisation(user, code);
      // Uniquement en mode développement (MAIL_USER vide) : permet de tester sans boîte mail.
      if (mailConfig.modeConsole) codeDev = code;
    }

    // Réponse identique que l'email existe ou non.
    return reponse(res, 200, MESSAGE_MDP_OUBLIE, codeDev ? { codeDev } : null);
  } catch (err) {
    return gererErreur(res, err);
  }
};

exports.reinitialiserMotDePasse = async (req, res) => {
  try {
    const { email, code, nouveauMotDePasse } = req.body || {};
    if (
      typeof email !== 'string' || !email.trim() ||
      typeof code !== 'string' || !code.trim() ||
      typeof nouveauMotDePasse !== 'string'
    ) {
      return reponse(res, 400, 'Email, code et nouveau mot de passe obligatoires');
    }
    if (nouveauMotDePasse.length < config.longueurMinMotDePasse) {
      return reponse(
        res,
        400,
        `Le nouveau mot de passe doit contenir au moins ${config.longueurMinMotDePasse} caractères`
      );
    }

    // Réserve une tentative de façon atomique AVANT de comparer le code : des requêtes simultanées
    // ne peuvent pas dépasser le nombre d'essais autorisés. Sans code actif ou essais épuisés : aucun résultat.
    const user = await User.findOneAndUpdate(
      {
        email: email.trim().toLowerCase(),
        codeReinitialisation: { $type: 'string' },
        tentativesCode: { $not: { $gte: config.maxTentativesCode } },
      },
      { $inc: { tentativesCode: 1 } },
      { new: true }
    ).select('+motDePasse +codeReinitialisation +codeReinitialisationExpire +tentativesCode');
    if (!user) return reponse(res, 400, MESSAGE_CODE_INVALIDE);

    const invalider = () =>
      User.updateOne(
        { _id: user._id },
        { $unset: { codeReinitialisation: 1, codeReinitialisationExpire: 1, tentativesCode: 1 } }
      );

    if (!user.codeReinitialisationExpire || user.codeReinitialisationExpire <= new Date()) {
      await invalider();
      return reponse(res, 400, MESSAGE_CODE_INVALIDE);
    }

    if (!user.verifierCodeReinitialisation(code)) {
      // Au bout de maxTentativesCode codes faux, le code est invalidé : il faut en redemander un.
      if (user.tentativesCode >= config.maxTentativesCode) await invalider();
      return reponse(res, 400, MESSAGE_CODE_INVALIDE);
    }

    // Code correct : le nouveau mot de passe doit différer de l'ancien (le code reste utilisable).
    if (await user.verifierMotDePasse(nouveauMotDePasse)) {
      await User.updateOne({ _id: user._id }, { tentativesCode: 0 });
      return reponse(res, 400, "Le nouveau mot de passe doit être différent de l'ancien");
    }

    // Le code est à usage unique : une seule requête peut le consommer (atomique).
    const reclame = await User.findOneAndUpdate(
      { _id: user._id, codeReinitialisation: user.codeReinitialisation },
      { $unset: { codeReinitialisation: 1, codeReinitialisationExpire: 1, tentativesCode: 1 } }
    );
    if (!reclame) return reponse(res, 400, MESSAGE_CODE_INVALIDE);

    // save() : le hook du modèle hashe le nouveau mot de passe avec bcrypt.
    user.motDePasse = nouveauMotDePasse;
    user.codeReinitialisation = undefined;
    user.codeReinitialisationExpire = undefined;
    user.tentativesCode = undefined;
    user.tentativesEchouees = 0;
    user.verrouilleJusqua = null;
    user.motDePasseModifieLe = new Date();
    await user.save();

    await journaliser(user, 'REINITIALISATION_MDP', 'Mot de passe réinitialisé avec un code à usage unique');
    envoyerEmailConfirmationMotDePasse(user); // sans await : ne lève jamais d'erreur

    return reponse(res, 200, 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter');
  } catch (err) {
    return gererErreur(res, err);
  }
};
