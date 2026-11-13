const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Cv = require("../models/cv");
const Candidature = require("../models/candidature");

const dossierUploads = path.join(__dirname, "..", "uploads");

function erreur(res, err) {
  console.log(err.message);
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: "erreur serveur" });
}

function echapper(texte) {
  return String(texte).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ================= CRUD =================

// POST /cvs
async function addcv(req, res) {
  try {
    const cv = new Cv(req.body);
    cv.fichier = undefined; // le fichier vient seulement de l'upload ou de la generation
    cv.origine = undefined;
    await cv.save();
    res.status(201).json(cv);
  } catch (err) {
    erreur(res, err);
  }
}

// GET /cvs : liste avec PAGINATION + TRI + FILTRE + RECHERCHE
// exemple : /cvs?page=1&limit=5&competence=node.js&specialite=Genie logiciel&q=ali&sort=nom&order=asc
async function showallcv(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    // --- filtre ---
    const filtre = {};
    if (req.query.etudiantId) filtre.etudiantId = String(req.query.etudiantId);
    if (req.query.specialite) {
      filtre.specialite = new RegExp("^" + echapper(req.query.specialite) + "$", "i");
    }
    if (req.query.competence) {
      // le CV doit contenir cette competence (sans tenir compte des majuscules)
      filtre.competences = new RegExp("^" + echapper(req.query.competence) + "$", "i");
    }

    // --- recherche ---
    if (req.query.q) {
      const motCle = new RegExp(echapper(req.query.q), "i");
      filtre.$or = [
        { nom: motCle },
        { prenom: motCle },
        { titre: motCle },
        { resume: motCle },
      ];
    }

    // --- tri ---
    const champsAutorises = ["createdAt", "nom", "prenom", "specialite"];
    const champ = champsAutorises.includes(req.query.sort)
      ? req.query.sort
      : "createdAt";
    const ordre = req.query.order === "asc" ? 1 : -1;

    const data = await Cv.find(filtre)
      .sort({ [champ]: ordre })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Cv.countDocuments(filtre);

    res.status(200).json({
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      data: data,
    });
  } catch (err) {
    erreur(res, err);
  }
}

// GET /cvs/:id
async function showcv(req, res) {
  try {
    const cv = await Cv.findById(req.params.id);
    if (!cv) return res.status(404).json({ message: "cv introuvable" });
    res.status(200).json(cv);
  } catch (err) {
    erreur(res, err);
  }
}

// PUT /cvs/:id
async function updatecv(req, res) {
  try {
    delete req.body.fichier;
    delete req.body.origine;
    const cv = await Cv.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cv) return res.status(404).json({ message: "cv introuvable" });
    res.status(200).json(cv);
  } catch (err) {
    erreur(res, err);
  }
}

// DELETE /cvs/:id
async function deletecv(req, res) {
  try {
    // on ne supprime pas un CV deja envoye dans une candidature
    const utilise = await Candidature.countDocuments({ cv: req.params.id });
    if (utilise > 0) {
      return res.status(409).json({
        message: "ce cv est utilise dans " + utilise + " candidature(s)",
      });
    }
    const cv = await Cv.findByIdAndDelete(req.params.id);
    if (!cv) return res.status(404).json({ message: "cv introuvable" });
    if (cv.fichier) {
      fs.unlink(path.join(dossierUploads, path.basename(cv.fichier)), () => {});
    }
    res.status(200).json({ message: "cv supprime" });
  } catch (err) {
    erreur(res, err);
  }
}

// POST /cvs/:id/upload : envoyer son propre fichier CV (form-data, champ "fichier")
async function uploadcv(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "fichier obligatoire (champ : fichier)" });
    }
    const cv = await Cv.findById(req.params.id);
    if (!cv) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "cv introuvable" });
    }
    cv.fichier = "/uploads/" + req.file.filename;
    cv.origine = "UPLOAD";
    await cv.save();
    res.status(200).json(cv);
  } catch (err) {
    erreur(res, err);
  }
}

// ================= STATISTIQUES =================

// GET /cvs/stats
async function statscv(req, res) {
  try {
    const total = await Cv.countDocuments();
    const avecFichier = await Cv.countDocuments({ fichier: { $exists: true } });

    // les 10 competences les plus presentes dans les CV
    const topCompetences = await Cv.aggregate([
      { $unwind: "$competences" },
      { $group: { _id: { $toLower: "$competences" }, nombre: { $sum: 1 } } },
      { $sort: { nombre: -1, _id: 1 } },
      { $limit: 10 },
    ]);

    const parSpecialite = await Cv.aggregate([
      { $group: { _id: "$specialite", nombre: { $sum: 1 } } },
      { $sort: { nombre: -1 } },
    ]);

    const parOrigine = await Cv.aggregate([
      { $match: { origine: { $exists: true } } },
      { $group: { _id: "$origine", nombre: { $sum: 1 } } },
    ]);

    res.status(200).json({
      total: total,
      avecFichier: avecFichier,
      sansFichier: total - avecFichier,
      parOrigine: parOrigine,
      parSpecialite: parSpecialite,
      topCompetences: topCompetences,
    });
  } catch (err) {
    erreur(res, err);
  }
}

// ================= METIER 2 : GENERATION AUTOMATIQUE DU CV PFE =================

const BLEU = "#17295C";
const ORANGE = "#F28C28";
const GRIS = "#555555";

// titre de section : texte bleu + ligne orange
function section(doc, titre) {
  doc.moveDown(0.9);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(BLEU).text(titre.toUpperCase());
  const y = doc.y + 2;
  doc.moveTo(50, y).lineTo(545, y).lineWidth(1).strokeColor(ORANGE).stroke();
  doc.moveDown(0.5);
}

// ecrit le contenu du CV dans le document PDF
function dessinercv(doc, cv) {
  // --- en-tete ---
  doc.font("Helvetica-Bold").fontSize(22).fillColor(BLEU);
  doc.text(cv.prenom + " " + cv.nom.toUpperCase());
  doc.font("Helvetica").fontSize(12).fillColor(ORANGE);
  doc.text(cv.titre || "Candidat(e) pour un stage de fin d'etudes (PFE)");
  const contact = [cv.email, cv.telephone, cv.adresse].filter(Boolean);
  doc.moveDown(0.3).fontSize(10).fillColor(GRIS).text(contact.join("   |   "));

  // --- profil ---
  if (cv.resume) {
    section(doc, "Profil");
    doc.font("Helvetica").fontSize(10).fillColor("black");
    doc.text(cv.resume, { align: "justify" });
  }

  // --- formation ---
  if (cv.formations.length > 0) {
    section(doc, "Formation");
    cv.formations.forEach((f) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("black").text(f.diplome || "");
      const periode = [f.debut, f.fin].filter(Boolean).join(" - ");
      doc.font("Helvetica").fillColor(GRIS);
      doc.text([f.etablissement, periode].filter(Boolean).join("   |   "));
      doc.moveDown(0.3);
    });
  }

  // --- experiences ---
  if (cv.experiences.length > 0) {
    section(doc, "Experiences et stages");
    cv.experiences.forEach((e) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
      doc.text([e.poste, e.entreprise].filter(Boolean).join(" - "));
      const periode = [e.debut, e.fin].filter(Boolean).join(" - ");
      if (periode) doc.font("Helvetica").fillColor(GRIS).text(periode);
      if (e.description) {
        doc.font("Helvetica").fillColor("black").text(e.description, { align: "justify" });
      }
      doc.moveDown(0.3);
    });
  }

  // --- projets ---
  if (cv.projets.length > 0) {
    section(doc, "Projets academiques");
    cv.projets.forEach((p) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("black").text(p.titre || "");
      if (p.description) {
        doc.font("Helvetica").text(p.description, { align: "justify" });
      }
      if (p.technologies.length > 0) {
        doc.font("Helvetica-Oblique").fillColor(GRIS);
        doc.text("Technologies : " + p.technologies.join(", "));
      }
      doc.moveDown(0.3);
    });
  }

  // --- competences ---
  if (cv.competences.length > 0) {
    section(doc, "Competences");
    doc.font("Helvetica").fontSize(10).fillColor("black");
    doc.text(cv.competences.join("   -   "));
  }

  // --- langues ---
  if (cv.langues.length > 0) {
    section(doc, "Langues");
    doc.font("Helvetica").fontSize(10).fillColor("black");
    doc.text(
      cv.langues
        .map((l) => l.langue + (l.niveau ? " (" + l.niveau + ")" : ""))
        .join("   -   "),
    );
  }
}

// GET /cvs/:id/generer : cree le CV PFE en PDF a partir des donnees du CV
async function generercv(req, res) {
  try {
    const cv = await Cv.findById(req.params.id);
    if (!cv) return res.status(404).json({ message: "cv introuvable" });

    const nomFichier = "cv-pfe-" + cv._id + ".pdf";
    const chemin = path.join(dossierUploads, nomFichier);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const flux = fs.createWriteStream(chemin);
    doc.pipe(flux);
    dessinercv(doc, cv);
    doc.end();

    // quand le fichier est completement ecrit sur le disque
    flux.on("finish", async () => {
      try {
        // si l'etudiant avait uploade un autre fichier, on le supprime
        const ancien = cv.fichier ? path.basename(cv.fichier) : null;
        if (ancien && ancien !== nomFichier) {
          fs.unlink(path.join(dossierUploads, ancien), () => {});
        }
        cv.fichier = "/uploads/" + nomFichier;
        cv.origine = "GENERE";
        await cv.save();
        res.download(chemin, "CV_PFE_" + cv.nom + "_" + cv.prenom + ".pdf");
      } catch (err) {
        erreur(res, err);
      }
    });
    flux.on("error", (err) => erreur(res, err));
  } catch (err) {
    erreur(res, err);
  }
}

module.exports = {
  addcv,
  showallcv,
  showcv,
  updatecv,
  deletecv,
  uploadcv,
  statscv,
  generercv,
};
