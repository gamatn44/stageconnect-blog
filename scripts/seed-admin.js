require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const dbconnection = require('../config/dbconnection.json');
const User = require('../models/user.model');

const main = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans le fichier .env');
  }

  await mongoose.connect(dbconnection.url);

  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ email })) {
    console.log(`Un compte existe déjà avec l'email ${email} : aucune modification.`);
    return;
  }

  await new User({
    nom: 'Admin',
    prenom: 'StageConnect',
    email,
    motDePasse: ADMIN_PASSWORD,
    role: 'admin',
    statut: 'actif',
    emailVerifie: true,
  }).save();
  console.log(`Administrateur créé : ${email}`);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
