const mongo = require("mongoose");
const schema = mongo.Schema;

// L'entretien est range a l'interieur de la candidature (sous-document) :
// on garde ainsi seulement 2 entites, Candidature et CV.
const Entretien = new schema(
  {
    date: { type: Date, required: true }, // debut de l'entretien
    fin: Date, // calculee : date + dureeMinutes
    dureeMinutes: { type: Number, default: 30, min: 10, max: 240 },
    type: { type: String, enum: ["PRESENTIEL", "EN_LIGNE"], default: "EN_LIGNE" },
    lieu: String, // adresse si PRESENTIEL
    lien: String, // lien Meet / Teams si EN_LIGNE
    statut: {
      type: String,
      enum: ["PLANIFIE", "REALISE", "ANNULE"],
      default: "PLANIFIE",
    },
    note: { type: Number, min: 0, max: 20 }, // note donnee apres l'entretien
    commentaire: String,
  },
  { _id: false },
);

// Entite 1 : Candidature
const Candidature = new schema(
  {
    etudiantId: { type: String, required: true },
    offreId: { type: String, required: true },
    offreTitre: { type: String, required: true }, // copie du titre (pour la recherche)
    entrepriseId: { type: String, required: true },
    cv: { type: schema.Types.ObjectId, ref: "cv", required: true },
    lettreMotivation: String,
    statut: {
      type: String,
      enum: ["EN_ATTENTE", "ACCEPTEE", "REFUSEE", "ANNULEE"],
      default: "EN_ATTENTE",
    },
    entretien: Entretien,
  },
  { timestamps: true },
);

// regle du cahier des charges : un etudiant ne postule qu'une fois a une offre
Candidature.index({ etudiantId: 1, offreId: 1 }, { unique: true });

module.exports = mongo.model("candidature", Candidature);
