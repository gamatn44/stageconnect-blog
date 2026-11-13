const Blog = require("../models/blog");
const Commentaire = require("../models/commentaire");
const Question = require("../models/question"); // ← AJOUTÉ
const { traduireTexte, languesAutorisees } = require("../utils/traduction");

// CREATE
async function addblog(req, res) {
  try {
    const blog = new Blog(req.body);
    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// READ tous
async function showallblog(req, res) {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// READ un seul
async function showblog(req, res) {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "blog introuvable" });
    res.status(200).json(blog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// UPDATE
async function updateblog(req, res) {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!blog) return res.status(404).json({ message: "blog introuvable" });
    res.status(200).json(blog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// DELETE : supprime le blog, ses commentaires ET ses questions
async function deleteblog(req, res) {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "blog introuvable" });
    await Commentaire.deleteMany({ blog: req.params.id });
    await Question.deleteMany({ blog: req.params.id }); // ← AJOUTÉ
    res.status(200).json({ message: "blog, commentaires et questions supprimés" }); // ← MODIFIÉ
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// LIKE : ajoute +1 au nombre de likes
async function likeblog(req, res) {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ message: "blog introuvable" });
    res.status(200).json(blog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// SEARCH : recherche + filtres + tri
async function searchblog(req, res) {
  try {
    const { q, categorie, auteur, minLikes, depuis, tri } = req.query;
    const filtre = {};

    // protège les caractères spéciaux (ex : "C++") pour éviter une erreur
    const echapper = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // mot-clé dans le titre OU le contenu, sans tenir compte des majuscules
    if (q) {
      const regex = new RegExp(echapper(q), "i");
      filtre.$or = [{ titre: regex }, { contenu: regex }];
    }
    if (categorie) filtre.categorie = new RegExp("^" + echapper(categorie) + "$", "i");
    if (auteur) filtre.auteur = new RegExp(echapper(auteur), "i");
    if (minLikes) filtre.likes = { $gte: Number(minLikes) };
    if (depuis) {
      filtre.createdAt = { $gte: new Date(Date.now() - Number(depuis) * 24 * 60 * 60 * 1000) };
    }

    // tri
    let ordre = { createdAt: -1 }; // recent par défaut
    if (tri === "ancien") ordre = { createdAt: 1 };
    if (tri === "populaire") ordre = { likes: -1 };

    const blogs = await Blog.find(filtre).sort(ordre);
    res.status(200).json({ resultats: blogs.length, blogs });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// TRADUCTION : traduit le titre et le contenu d'un blog
async function traduireblog(req, res) {
  try {
    const langue = (req.query.langue || "en").toLowerCase();
    if (!languesAutorisees.includes(langue)) {
      return res.status(400).json({ message: "langue non disponible", languesAutorisees });
    }
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "blog introuvable" });

    const [titre, contenu] = await Promise.all([
      traduireTexte(blog.titre, langue),
      traduireTexte(blog.contenu, langue),
    ]);

    res.status(200).json({
      _id: blog._id,
      langue,
      original: { titre: blog.titre, contenu: blog.contenu },
      traduction: { titre, contenu },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { addblog, showallblog, showblog, updateblog, deleteblog, likeblog, searchblog, traduireblog };