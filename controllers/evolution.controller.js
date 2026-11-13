const Evolution = require("../models/evolution");
const { rechercherEvolutions } = require("../services/metier/evolution.service");

const champsAutorises = [
  "titre",
  "description",
  "type",
  "statut",
  "dateEvolution"
];

function extraireChamps(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const erreur = new Error("Le corps de la requête doit être un objet JSON.");
    erreur.status = 400;
    throw erreur;
  }

  const cles = Object.keys(body);
  if (!cles.length || cles.some((cle) => !champsAutorises.includes(cle))) {
    const erreur = new Error("Champs de l'évolution manquants ou non autorisés.");
    erreur.status = 400;
    throw erreur;
  }

  return Object.fromEntries(cles.map((cle) => [cle, body[cle]]));
}

function creerErreurIntrouvable() {
  const erreur = new Error("Évolution introuvable.");
  erreur.status = 404;
  return erreur;
}

async function lister(req, res) {
  const resultat = await rechercherEvolutions(req.query);
  return res.json(resultat);
}

async function obtenir(req, res) {
  const evolution = await Evolution.findById(req.params.id);
  if (!evolution) {
    throw creerErreurIntrouvable();
  }

  return res.json(evolution);
}

async function creer(req, res) {
  const evolution = await Evolution.create(extraireChamps(req.body));
  return res.status(201).json(evolution);
}

async function modifier(req, res) {
  const evolution = await Evolution.findByIdAndUpdate(
    req.params.id,
    { $set: extraireChamps(req.body) },
    { returnDocument: "after", runValidators: true }
  );
  if (!evolution) {
    throw creerErreurIntrouvable();
  }

  return res.json(evolution);
}

async function supprimer(req, res) {
  const evolution = await Evolution.findByIdAndDelete(req.params.id);
  if (!evolution) {
    throw creerErreurIntrouvable();
  }

  return res.status(200).json({
    message: "Évolution supprimée avec succès"
  });
}

module.exports = { lister, obtenir, creer, modifier, supprimer };
