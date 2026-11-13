var express = require("express");
var router = express.Router();
const candidatureController = require("../controller/CandidatureController");

// ATTENTION : les routes fixes (/stats, /entretiens/planning) sont placees
// AVANT "/:id", sinon Express prendrait "stats" pour un id.

// statistiques
router.get("/stats", candidatureController.statscandidature);

// metier : compteur de candidatures
router.get("/compteur", candidatureController.compteurcandidature);

// metier : agenda des entretiens
router.get("/entretiens/planning", candidatureController.planningentretiens);

// CRUD (+ pagination, tri, filtre, recherche sur la liste)
router.post("/", candidatureController.addcandidature);
router.get("/", candidatureController.showallcandidature);
router.get("/:id", candidatureController.showcandidature);
router.put("/:id", candidatureController.updatecandidature);
router.delete("/:id", candidatureController.deletecandidature);

// accepter / refuser / annuler
router.patch("/:id/statut", candidatureController.changerstatut);

// metier : gestion de l'entretien d'une candidature
router.post("/:id/entretien", candidatureController.planifierentretien);
router.put("/:id/entretien", candidatureController.reporterentretien);
router.delete("/:id/entretien", candidatureController.annulerentretien);
router.patch("/:id/entretien/resultat", candidatureController.resultatentretien);

module.exports = router;
