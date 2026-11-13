const Blog = require("../models/blog");
const Commentaire = require("../models/commentaire");
const { gravatarUrl, calculerBadges } = require("../utils/auteur");

// calcule les statistiques de TOUS les auteurs, regroupées par email
async function statsDesAuteurs() {
  const [blogs, commentairesEcrits, commentairesRecus] = await Promise.all([
    // blogs publiés et likes reçus
    Blog.aggregate([
      { $group: { _id: "$email", auteur: { $first: "$auteur" }, nbBlogs: { $sum: 1 }, likesRecus: { $sum: "$likes" } } },
    ]),
    // commentaires écrits
    Commentaire.aggregate([
      { $group: { _id: "$email", auteur: { $first: "$auteur" }, nb: { $sum: 1 } } },
    ]),
    // commentaires reçus sur ses blogs (jointure commentaire -> blog)
    Commentaire.aggregate([
      { $lookup: { from: "blogs", localField: "blog", foreignField: "_id", as: "blog" } },
      { $unwind: "$blog" },
      { $group: { _id: "$blog.email", nb: { $sum: 1 } } },
    ]),
  ]);

  // on fusionne tout dans un objet { email: {stats} }
  const auteurs = {};
  const getAuteur = (email, nom) => {
    if (!auteurs[email]) {
      auteurs[email] = { email, auteur: nom, nbBlogs: 0, likesRecus: 0, commentairesEcrits: 0, commentairesRecus: 0 };
    }
    return auteurs[email];
  };

  blogs.forEach((b) => Object.assign(getAuteur(b._id, b.auteur), { nbBlogs: b.nbBlogs, likesRecus: b.likesRecus }));
  commentairesEcrits.forEach((c) => (getAuteur(c._id, c.auteur).commentairesEcrits = c.nb));
  commentairesRecus.forEach((c) => {
    if (auteurs[c._id]) auteurs[c._id].commentairesRecus = c.nb;
  });

  return auteurs;
}

// construit la fiche d'un auteur : stats + avatar Gravatar + badges
function ficheAuteur(stats) {
  const { gagnes, aDebloquer } = calculerBadges(stats);
  return {
    auteur: stats.auteur,
    email: stats.email,
    avatar: gravatarUrl(stats.email),
    stats: {
      nbBlogs: stats.nbBlogs,
      likesRecus: stats.likesRecus,
      commentairesEcrits: stats.commentairesEcrits,
      commentairesRecus: stats.commentairesRecus,
    },
    nbBadges: gagnes.length,
    badges: gagnes,
    aDebloquer,
  };
}

// GET /auteurs : tous les auteurs, classés par nombre de badges
async function showallauteurs(req, res) {
  try {
    const auteurs = await statsDesAuteurs();
    const liste = Object.values(auteurs)
      .map(ficheAuteur)
      .map(({ aDebloquer, ...fiche }) => fiche) // on n'affiche pas les badges à débloquer dans la liste
      .sort((a, b) => b.nbBadges - a.nbBadges || b.stats.likesRecus - a.stats.likesRecus);
    res.status(200).json(liste);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /auteurs/:email : profil complet d'un auteur + ses blogs
async function showauteur(req, res) {
  try {
    const email = req.params.email.toLowerCase();
    const auteurs = await statsDesAuteurs();
    if (!auteurs[email]) return res.status(404).json({ message: "auteur introuvable" });

    const sesBlogs = await Blog.find({ email }).select("titre categorie likes createdAt").sort({ createdAt: -1 });
    res.status(200).json({ ...ficheAuteur(auteurs[email]), blogs: sesBlogs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { showallauteurs, showauteur };