const Commentaire = require("../models/commentaire");
const Blog = require("../models/blog");
const { traduireTexte, languesAutorisees } = require("../utils/traduction");

// CREATE : on vérifie d'abord que le blog existe
async function addcommentaire(req, res) {
  try {
    const blog = await Blog.findById(req.body.blog);
    if (!blog) return res.status(404).json({ message: "blog introuvable" });

    const commentaire = new Commentaire(req.body);
    await commentaire.save();
    res.status(201).json(commentaire);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// READ tous (avec le titre du blog)
async function showallcommentaire(req, res) {
  try {
    const commentaires = await Commentaire.find().populate("blog", "titre");
    res.status(200).json(commentaires);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// READ un seul
async function showcommentaire(req, res) {
  try {
    const commentaire = await Commentaire.findById(req.params.id).populate("blog", "titre");
    if (!commentaire) return res.status(404).json({ message: "commentaire introuvable" });
    res.status(200).json(commentaire);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// READ : les commentaires d'un blog précis
async function showcommentairesbyblog(req, res) {
  try {
    const commentaires = await Commentaire.find({ blog: req.params.idblog }).sort({ createdAt: -1 });
    res.status(200).json(commentaires);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// UPDATE
async function updatecommentaire(req, res) {
  try {
    const commentaire = await Commentaire.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!commentaire) return res.status(404).json({ message: "commentaire introuvable" });
    res.status(200).json(commentaire);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// DELETE
async function deletecommentaire(req, res) {
  try {
    const commentaire = await Commentaire.findByIdAndDelete(req.params.id);
    if (!commentaire) return res.status(404).json({ message: "commentaire introuvable" });
    res.status(200).json({ message: "commentaire supprimé" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
// TRADUCTION : traduit un commentaire
async function traduirecommentaire(req, res) {
  try {
    const langue = (req.query.langue || "en").toLowerCase();
    if (!languesAutorisees.includes(langue)) {
      return res.status(400).json({ message: "langue non disponible", languesAutorisees });
    }
    const commentaire = await Commentaire.findById(req.params.id);
    if (!commentaire) return res.status(404).json({ message: "commentaire introuvable" });

    const traduction = await traduireTexte(commentaire.contenu, langue);
    res.status(200).json({ _id: commentaire._id, langue, original: commentaire.contenu, traduction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  addcommentaire,
  showallcommentaire,
  showcommentaire,
  showcommentairesbyblog,
  updatecommentaire,
  deletecommentaire,
  traduirecommentaire,
};