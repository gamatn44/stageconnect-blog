const Candidature = require("../models/candidature");
const Cv = require("../models/cv");

// regle du compteur : un etudiant ne peut pas avoir plus de 5 candidatures
// EN_ATTENTE en meme temps
const MAX_EN_ATTENTE = 5;

// ---------- petites fonctions utiles ----------

// transforme une erreur Mongoose en reponse HTTP claire
function erreur(res, err) {
  console.log(err.message);
  if (err.code === 11000) {
    return res
      .status(409)
      .json({ message: "vous avez deja postule a cette offre" });
  }
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: "erreur serveur" });
}

// pour que la recherche accepte n'importe quel texte sans casser le regex
function echapper(texte) {
  return String(texte).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ================= CRUD =================

// POST /candidatures : postuler a une offre
async function addcandidature(req, res) {
  try {
    const cv = await Cv.findById(req.body.cv);
    if (!cv) {
      return res.status(404).json({ message: "cv introuvable" });
    }
    // compteur : on verifie que l'etudiant n'a pas atteint la limite
    const enAttente = await Candidature.countDocuments({
      etudiantId: String(req.body.etudiantId),
      statut: "EN_ATTENTE",
    });
    if (enAttente >= MAX_EN_ATTENTE) {
      return res.status(400).json({
        message:
          "limite atteinte : " + MAX_EN_ATTENTE + " candidatures en attente maximum",
      });
    }
    const candidature = new Candidature({
      etudiantId: req.body.etudiantId,
      offreId: req.body.offreId,
      offreTitre: req.body.offreTitre,
      entrepriseId: req.body.entrepriseId,
      cv: req.body.cv,
      lettreMotivation: req.body.lettreMotivation,
    }); // le statut commence toujours a EN_ATTENTE
    await candidature.save();
    res.status(201).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// GET /candidatures : liste avec PAGINATION + TRI + FILTRE + RECHERCHE
// exemple : /candidatures?page=1&limit=5&statut=EN_ATTENTE&q=node&sort=createdAt&order=desc
async function showallcandidature(req, res) {
  try {
    // --- pagination ---
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    // --- filtre ---
    const filtre = {};
    if (req.query.statut) filtre.statut = String(req.query.statut);
    if (req.query.etudiantId) filtre.etudiantId = String(req.query.etudiantId);
    if (req.query.entrepriseId)
      filtre.entrepriseId = String(req.query.entrepriseId);
    if (req.query.offreId) filtre.offreId = String(req.query.offreId);
    if (req.query.dateDebut || req.query.dateFin) {
      filtre.createdAt = {};
      if (req.query.dateDebut)
        filtre.createdAt.$gte = new Date(String(req.query.dateDebut));
      if (req.query.dateFin)
        filtre.createdAt.$lte = new Date(String(req.query.dateFin));
    }

    // --- recherche (mot cle dans le titre de l'offre ou la lettre) ---
    if (req.query.q) {
      const motCle = new RegExp(echapper(req.query.q), "i");
      filtre.$or = [{ offreTitre: motCle }, { lettreMotivation: motCle }];
    }

    // --- tri ---
    const champsAutorises = ["createdAt", "statut", "offreTitre", "entretien.date"];
    const champ = champsAutorises.includes(req.query.sort)
      ? req.query.sort
      : "createdAt";
    const ordre = req.query.order === "asc" ? 1 : -1;

    const data = await Candidature.find(filtre)
      .sort({ [champ]: ordre })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("cv", "nom prenom email specialite competences");
    const total = await Candidature.countDocuments(filtre);

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

// GET /candidatures/:id
async function showcandidature(req, res) {
  try {
    const candidature = await Candidature.findById(req.params.id).populate("cv");
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    res.status(200).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// PUT /candidatures/:id : l'etudiant modifie sa lettre ou change de CV
async function updatecandidature(req, res) {
  try {
    const candidature = await Candidature.findById(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    if (candidature.statut !== "EN_ATTENTE") {
      return res.status(400).json({
        message: "une candidature deja traitee ne peut plus etre modifiee",
      });
    }
    if (req.body.cv) {
      const cv = await Cv.findById(req.body.cv);
      if (!cv) return res.status(404).json({ message: "cv introuvable" });
      candidature.cv = req.body.cv;
    }
    if (req.body.lettreMotivation !== undefined) {
      candidature.lettreMotivation = req.body.lettreMotivation;
    }
    await candidature.save();
    res.status(200).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// DELETE /candidatures/:id
async function deletecandidature(req, res) {
  try {
    const candidature = await Candidature.findByIdAndDelete(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    res.status(200).json({ message: "candidature supprimee" });
  } catch (err) {
    erreur(res, err);
  }
}

// PATCH /candidatures/:id/statut : accepter, refuser ou annuler
// body : { "statut": "ACCEPTEE" }
async function changerstatut(req, res) {
  try {
    const nouveau = req.body.statut;
    if (!["ACCEPTEE", "REFUSEE", "ANNULEE"].includes(nouveau)) {
      return res
        .status(400)
        .json({ message: "statut doit etre ACCEPTEE, REFUSEE ou ANNULEE" });
    }
    const candidature = await Candidature.findById(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    if (candidature.statut !== "EN_ATTENTE") {
      return res.status(400).json({
        message: "cette candidature est deja " + candidature.statut,
      });
    }
    candidature.statut = nouveau;
    // si la candidature est refusee ou annulee, l'entretien prevu est annule aussi
    if (
      nouveau !== "ACCEPTEE" &&
      candidature.entretien &&
      candidature.entretien.statut === "PLANIFIE"
    ) {
      candidature.entretien.statut = "ANNULE";
    }
    await candidature.save();
    res.status(200).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// ================= STATISTIQUES =================

// GET /candidatures/stats   (option : ?entrepriseId=... ou ?etudiantId=...)
async function statscandidature(req, res) {
  try {
    const filtre = {};
    if (req.query.entrepriseId)
      filtre.entrepriseId = String(req.query.entrepriseId);
    if (req.query.etudiantId) filtre.etudiantId = String(req.query.etudiantId);

    const total = await Candidature.countDocuments(filtre);

    // nombre de candidatures pour chaque statut
    const parStatut = await Candidature.aggregate([
      { $match: filtre },
      { $group: { _id: "$statut", nombre: { $sum: 1 } } },
    ]);

    // nombre de candidatures par mois
    const parMois = await Candidature.aggregate([
      { $match: filtre },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          nombre: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // les 5 offres qui recoivent le plus de candidatures
    const topOffres = await Candidature.aggregate([
      { $match: filtre },
      {
        $group: {
          _id: "$offreId",
          titre: { $first: "$offreTitre" },
          nombre: { $sum: 1 },
        },
      },
      { $sort: { nombre: -1 } },
      { $limit: 5 },
    ]);

    // entretiens : nombre par statut + note moyenne
    const entretiens = await Candidature.aggregate([
      { $match: { ...filtre, entretien: { $exists: true } } },
      {
        $group: {
          _id: "$entretien.statut",
          nombre: { $sum: 1 },
          noteMoyenne: { $avg: "$entretien.note" },
        },
      },
    ]);

    const acceptees = parStatut.find((s) => s._id === "ACCEPTEE");
    const refusees = parStatut.find((s) => s._id === "REFUSEE");
    const traitees =
      (acceptees ? acceptees.nombre : 0) + (refusees ? refusees.nombre : 0);

    res.status(200).json({
      total: total,
      parStatut: parStatut,
      // sur les candidatures traitees (acceptees + refusees), combien sont acceptees
      tauxAcceptation:
        traitees === 0
          ? 0
          : Math.round(((acceptees ? acceptees.nombre : 0) / traitees) * 100),
      parMois: parMois,
      topOffres: topOffres,
      entretiens: entretiens,
    });
  } catch (err) {
    erreur(res, err);
  }
}

// ================= METIER 3 : COMPTEUR DE CANDIDATURES =================

// GET /candidatures/compteur?etudiantId=etu1
//  (ou ?offreId=off1 pour une offre, ou ?entrepriseId=ent1 pour une entreprise)
async function compteurcandidature(req, res) {
  try {
    const filtre = {};
    if (req.query.etudiantId) filtre.etudiantId = String(req.query.etudiantId);
    if (req.query.offreId) filtre.offreId = String(req.query.offreId);
    if (req.query.entrepriseId)
      filtre.entrepriseId = String(req.query.entrepriseId);
    if (Object.keys(filtre).length === 0) {
      return res.status(400).json({
        message: "donnez etudiantId, offreId ou entrepriseId dans l'URL",
      });
    }

    // on compte les candidatures, au total puis pour chaque statut
    const compteur = {
      total: await Candidature.countDocuments(filtre),
      enAttente: await Candidature.countDocuments({
        ...filtre,
        statut: "EN_ATTENTE",
      }),
      acceptees: await Candidature.countDocuments({
        ...filtre,
        statut: "ACCEPTEE",
      }),
      refusees: await Candidature.countDocuments({
        ...filtre,
        statut: "REFUSEE",
      }),
      annulees: await Candidature.countDocuments({
        ...filtre,
        statut: "ANNULEE",
      }),
      entretiensPlanifies: await Candidature.countDocuments({
        ...filtre,
        "entretien.statut": "PLANIFIE",
      }),
    };

    // pour un etudiant : combien de candidatures il peut encore envoyer
    if (filtre.etudiantId) {
      const enAttenteEtudiant = await Candidature.countDocuments({
        etudiantId: filtre.etudiantId,
        statut: "EN_ATTENTE",
      });
      compteur.maxEnAttente = MAX_EN_ATTENTE;
      compteur.restantes = Math.max(MAX_EN_ATTENTE - enAttenteEtudiant, 0);
    }

    res.status(200).json(compteur);
  } catch (err) {
    erreur(res, err);
  }
}

// ================= METIER 1 : ENTRETIENS =================

// cherche un autre entretien PLANIFIE qui tombe sur le meme creneau,
// pour la meme entreprise ou pour le meme etudiant
async function trouverconflit(candidature, debut, fin) {
  return Candidature.findOne({
    _id: { $ne: candidature._id },
    $or: [
      { entrepriseId: candidature.entrepriseId },
      { etudiantId: candidature.etudiantId },
    ],
    "entretien.statut": "PLANIFIE",
    "entretien.date": { $lt: fin },
    "entretien.fin": { $gt: debut },
  });
}

// verifie la date et renvoie { debut, fin, duree } ou un message d'erreur
function lirecreneau(body, dureeParDefaut) {
  const debut = new Date(body.date);
  if (!body.date || isNaN(debut.getTime())) {
    return { message: "date obligatoire (ex : 2026-12-01T10:00:00)" };
  }
  if (debut <= new Date()) {
    return { message: "la date de l'entretien doit etre dans le futur" };
  }
  const duree = Number(body.dureeMinutes) || dureeParDefaut || 30;
  const fin = new Date(debut.getTime() + duree * 60000);
  return { debut: debut, fin: fin, duree: duree };
}

// POST /candidatures/:id/entretien : planifier un entretien
// body : { "date": "2026-12-01T10:00:00", "dureeMinutes": 30, "type": "EN_LIGNE", "lien": "https://meet..." }
async function planifierentretien(req, res) {
  try {
    const candidature = await Candidature.findById(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    if (candidature.statut !== "EN_ATTENTE") {
      return res.status(400).json({
        message: "entretien possible seulement pour une candidature EN_ATTENTE",
      });
    }
    if (candidature.entretien && candidature.entretien.statut === "PLANIFIE") {
      return res.status(400).json({
        message: "un entretien est deja planifie, utilisez PUT pour le reporter",
      });
    }
    const creneau = lirecreneau(req.body);
    if (creneau.message) return res.status(400).json(creneau);

    const conflit = await trouverconflit(candidature, creneau.debut, creneau.fin);
    if (conflit) {
      return res.status(409).json({
        message: "creneau deja pris par un autre entretien",
        entretienEnConflit: conflit.entretien,
      });
    }

    candidature.entretien = {
      date: creneau.debut,
      fin: creneau.fin,
      dureeMinutes: creneau.duree,
      type: req.body.type,
      lieu: req.body.lieu,
      lien: req.body.lien,
      statut: "PLANIFIE",
    };
    await candidature.save();
    res.status(201).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// PUT /candidatures/:id/entretien : reporter l'entretien (nouvelle date)
async function reporterentretien(req, res) {
  try {
    const candidature = await Candidature.findById(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    if (!candidature.entretien || candidature.entretien.statut !== "PLANIFIE") {
      return res.status(400).json({ message: "aucun entretien planifie" });
    }
    const creneau = lirecreneau(req.body, candidature.entretien.dureeMinutes);
    if (creneau.message) return res.status(400).json(creneau);

    const conflit = await trouverconflit(candidature, creneau.debut, creneau.fin);
    if (conflit) {
      return res.status(409).json({
        message: "creneau deja pris par un autre entretien",
        entretienEnConflit: conflit.entretien,
      });
    }

    candidature.entretien.date = creneau.debut;
    candidature.entretien.fin = creneau.fin;
    candidature.entretien.dureeMinutes = creneau.duree;
    if (req.body.type) candidature.entretien.type = req.body.type;
    if (req.body.lieu) candidature.entretien.lieu = req.body.lieu;
    if (req.body.lien) candidature.entretien.lien = req.body.lien;
    await candidature.save();
    res.status(200).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// DELETE /candidatures/:id/entretien : annuler l'entretien
async function annulerentretien(req, res) {
  try {
    const candidature = await Candidature.findById(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    if (!candidature.entretien || candidature.entretien.statut !== "PLANIFIE") {
      return res.status(400).json({ message: "aucun entretien planifie" });
    }
    candidature.entretien.statut = "ANNULE";
    await candidature.save();
    res.status(200).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// PATCH /candidatures/:id/entretien/resultat : saisir le resultat de l'entretien
// body : { "note": 15, "commentaire": "bon profil", "decision": "ACCEPTEE" }
// "decision" est optionnelle : ACCEPTEE ou REFUSEE met a jour la candidature
async function resultatentretien(req, res) {
  try {
    const candidature = await Candidature.findById(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "candidature introuvable" });
    }
    if (!candidature.entretien || candidature.entretien.statut !== "PLANIFIE") {
      return res.status(400).json({ message: "aucun entretien planifie" });
    }
    const note = Number(req.body.note);
    if (req.body.note === undefined || isNaN(note) || note < 0 || note > 20) {
      return res.status(400).json({ message: "note obligatoire entre 0 et 20" });
    }
    const decision = req.body.decision;
    if (decision && !["ACCEPTEE", "REFUSEE"].includes(decision)) {
      return res
        .status(400)
        .json({ message: "decision doit etre ACCEPTEE ou REFUSEE" });
    }
    candidature.entretien.statut = "REALISE";
    candidature.entretien.note = note;
    candidature.entretien.commentaire = req.body.commentaire;
    if (decision) candidature.statut = decision;
    await candidature.save();
    res.status(200).json(candidature);
  } catch (err) {
    erreur(res, err);
  }
}

// GET /candidatures/entretiens/planning : agenda des entretiens planifies
// exemple : /candidatures/entretiens/planning?entrepriseId=ent1&du=2026-12-01&au=2026-12-31
async function planningentretiens(req, res) {
  try {
    const filtre = { "entretien.statut": "PLANIFIE" };
    if (req.query.entrepriseId)
      filtre.entrepriseId = String(req.query.entrepriseId);
    if (req.query.etudiantId) filtre.etudiantId = String(req.query.etudiantId);
    if (req.query.du || req.query.au) {
      filtre["entretien.date"] = {};
      if (req.query.du)
        filtre["entretien.date"].$gte = new Date(String(req.query.du));
      if (req.query.au)
        filtre["entretien.date"].$lte = new Date(String(req.query.au));
    }
    const liste = await Candidature.find(filtre)
      .sort({ "entretien.date": 1 }) // du plus proche au plus lointain
      .populate("cv", "nom prenom email telephone");
    res.status(200).json({ total: liste.length, data: liste });
  } catch (err) {
    erreur(res, err);
  }
}

module.exports = {
  addcandidature,
  showallcandidature,
  showcandidature,
  updatecandidature,
  deletecandidature,
  changerstatut,
  statscandidature,
  compteurcandidature,
  planifierentretien,
  reporterentretien,
  annulerentretien,
  resultatentretien,
  planningentretiens,
};
