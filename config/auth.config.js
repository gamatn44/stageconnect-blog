require('dotenv').config({ quiet: true });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET manquant : définissez-le dans le fichier .env (voir .env.example)');
}

module.exports = {
  // Verrouillage du compte
  maxTentatives: 5,
  dureeVerrouillageMinutes: 15,

  // Inscription et vérification de l'email
  rolesInscription: ['etudiant', 'entreprise'],
  dureeVerificationEmailHeures: 24,

  // Mot de passe oublié (code à 6 chiffres)
  dureeCodeReinitialisationMinutes: 15,
  maxTentativesCode: 5,
  longueurMinMotDePasse: 6,

  // JWT (valeurs lues dans .env)
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
