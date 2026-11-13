const mongo = require("mongoose");
const schema = mongo.Schema;

// Entite 2 : CV
// Contient les informations de l'etudiant. Elles servent a generer
// automatiquement le CV PFE en PDF (voir CvController.generercv).
const Cv = new schema(
  {
    etudiantId: { type: String, required: true }, // id de l'etudiant (service Auth & Users)
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, required: true },
    telephone: String,
    adresse: String,
    titre: String, // ex : "Etudiant ingenieur 5eme annee - Stage PFE"
    specialite: String, // ex : "Genie logiciel", "Data science"
    resume: String, // petit paragraphe de presentation
    competences: [String],
    formations: [
      { diplome: String, etablissement: String, debut: String, fin: String },
    ],
    experiences: [
      {
        poste: String,
        entreprise: String,
        debut: String,
        fin: String,
        description: String,
      },
    ],
    projets: [{ titre: String, description: String, technologies: [String] }],
    langues: [{ langue: String, niveau: String }],
    fichier: String, // chemin du fichier CV (uploade ou genere)
    origine: { type: String, enum: ["UPLOAD", "GENERE"] }, // d'ou vient le fichier
  },
  { timestamps: true }, // ajoute createdAt et updatedAt
);

module.exports = mongo.model("cv", Cv);
