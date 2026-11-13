const Document = require("../models/document");
const { rechercherDocuments } = require("../services/metier/document.service");

const champsAutorises = [
  "titre",
  "description",
  "type",
  "statut",
  "fichierUrl",
  "dateDocument"
];

function extraireChamps(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const erreur = new Error("Le corps de la requête doit être un objet JSON.");
    erreur.status = 400;
    throw erreur;
  }

  const cles = Object.keys(body);
  if (!cles.length || cles.some((cle) => !champsAutorises.includes(cle))) {
    const erreur = new Error("Champs du document manquants ou non autorisés.");
    erreur.status = 400;
    throw erreur;
  }

  return Object.fromEntries(cles.map((cle) => [cle, body[cle]]));
}

function creerErreurIntrouvable() {
  const erreur = new Error("Document introuvable.");
  erreur.status = 404;
  return erreur;
}

async function lister(req, res) {
  const resultat = await rechercherDocuments(req.query);
  return res.json(resultat);
}

async function obtenir(req, res) {
  const document = await Document.findById(req.params.id);
  if (!document) {
    throw creerErreurIntrouvable();
  }

  return res.json(document);
}

async function creer(req, res) {
  const document = await Document.create(extraireChamps(req.body));
  return res.status(201).json(document);
}

async function modifier(req, res) {
  const document = await Document.findByIdAndUpdate(
    req.params.id,
    { $set: extraireChamps(req.body) },
    { returnDocument: "after", runValidators: true }
  );
  if (!document) {
    throw creerErreurIntrouvable();
  }

  return res.json(document);
}

async function supprimer(req, res) {
  const document = await Document.findByIdAndDelete(req.params.id);
  if (!document) {
    throw creerErreurIntrouvable();
  }

  return res.status(200).json({
    message: "Document supprimé avec succès"
  });
}

module.exports = { lister, obtenir, creer, modifier, supprimer };
