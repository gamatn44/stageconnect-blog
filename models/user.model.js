const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { dureeVerificationEmailHeures, dureeCodeReinitialisationMinutes, jwtSecret } = require('../config/auth.config');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: [true, 'Le nom est obligatoire'], trim: true },
    prenom: { type: String, required: [true, 'Le prénom est obligatoire'], trim: true },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format d'email invalide"],
    },
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
      select: false,
    },
    telephone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['etudiant', 'entreprise', 'admin'],
      default: 'etudiant',
    },
    statut: {
      type: String,
      enum: ['actif', 'inactif', 'bloque'],
      default: 'actif',
    },
    tentativesEchouees: { type: Number, default: 0 },
    verrouilleJusqua: { type: Date, default: null },
    emailVerifie: { type: Boolean, default: false },
    // Hash SHA-256 du token envoyé par mail (le token en clair n'est jamais stocké).
    tokenVerification: { type: String, select: false },
    tokenVerificationExpire: { type: Date, select: false },
    // Mot de passe oublié : hash du code à 6 chiffres (jamais le code), expiration et essais ratés.
    codeReinitialisation: { type: String, select: false },
    codeReinitialisationExpire: { type: Date, select: false },
    tentativesCode: { type: Number, default: 0, select: false },
    // Les JWT émis avant cette date sont refusés (voir middlewares/auth.js).
    motDePasseModifieLe: { type: Date },
  },
  { timestamps: true }
);

// Hash le mot de passe à la création et à chaque modification de ce champ.
userSchema.pre('save', async function () {
  if (!this.isModified('motDePasse')) return;
  this.motDePasse = await bcrypt.hash(this.motDePasse, SALT_ROUNDS);
  // Mot de passe changé sur un compte existant (réinitialisation, PUT admin...) : les JWT émis
  // avant cet instant sont refusés par le middleware. Pas à la création : aucun token n'existe encore.
  if (!this.isNew) this.motDePasseModifieLe = new Date();
});

// Compare un mot de passe en clair avec le hash (charger l'utilisateur avec .select('+motDePasse')).
userSchema.methods.verifierMotDePasse = function (motDePasseClair) {
  return bcrypt.compare(motDePasseClair, this.motDePasse);
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
userSchema.statics.hashToken = hashToken;

// Génère un token de vérification (32 octets aléatoires), stocke son hash et sa date d'expiration
// sur le document (à sauvegarder ensuite) et retourne le token en clair, à envoyer par mail.
userSchema.methods.genererTokenVerification = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.tokenVerification = hashToken(token);
  this.tokenVerificationExpire = new Date(Date.now() + dureeVerificationEmailHeures * 60 * 60 * 1000);
  return token;
};

// Hash du code à 6 chiffres : HMAC-SHA256 avec le secret de l'application, car un SHA-256 simple
// d'un code de 10^6 possibilités se retrouverait en quelques millisecondes si la base fuitait.
const hashCode = (code) => crypto.createHmac('sha256', jwtSecret).update(String(code)).digest('hex');

// Génère un code à 6 chiffres (crypto.randomInt), valable 15 minutes, et remet les essais à zéro.
// Seul le hash est stocké sur le document (à sauvegarder ensuite) ; le code en clair est retourné.
userSchema.methods.genererCodeReinitialisation = function () {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  this.codeReinitialisation = hashCode(code);
  this.codeReinitialisationExpire = new Date(Date.now() + dureeCodeReinitialisationMinutes * 60 * 1000);
  this.tentativesCode = 0;
  return code;
};

// Compare un code saisi avec le hash stocké (charger l'utilisateur avec .select('+codeReinitialisation')).
userSchema.methods.verifierCodeReinitialisation = function (code) {
  if (!this.codeReinitialisation || typeof code !== 'string') return false;
  const attendu = Buffer.from(this.codeReinitialisation, 'hex');
  const recu = Buffer.from(hashCode(code), 'hex');
  return attendu.length === recu.length && crypto.timingSafeEqual(attendu, recu);
};

// Ne jamais renvoyer le mot de passe ni les données de vérification / réinitialisation dans les réponses JSON.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.motDePasse;
    delete ret.tokenVerification;
    delete ret.tokenVerificationExpire;
    delete ret.codeReinitialisation;
    delete ret.codeReinitialisationExpire;
    delete ret.tentativesCode;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
