const Blog = require("../models/blog");
const Commentaire = require("../models/commentaire");

// STATISTIQUES GLOBALES du blog
async function statsglobales(req, res) {
  try {
    const ilYa7Jours = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // on lance toutes les requêtes en même temps (plus rapide)
    const [
      nbBlogs,
      nbCommentaires,
      likes,
      parCategorie,
      topLikes,
      topCommentes,
      topAuteurs,
      topCommentateurs,
      activite7Jours,
    ] = await Promise.all([
      // 1. nombre total de blogs
      Blog.countDocuments(),

      // 2. nombre total de commentaires
      Commentaire.countDocuments(),

      // 3. total et moyenne des likes
      Blog.aggregate([
        { $group: { _id: null, total: { $sum: "$likes" }, moyenne: { $avg: "$likes" } } },
      ]),

      // 4. nombre de blogs et de likes par catégorie
      Blog.aggregate([
        { $group: { _id: "$categorie", nbBlogs: { $sum: 1 }, totalLikes: { $sum: "$likes" } } },
        { $sort: { nbBlogs: -1 } },
        { $project: { _id: 0, categorie: "$_id", nbBlogs: 1, totalLikes: 1 } },
      ]),

      // 5. les 3 blogs les plus likés
      Blog.find().sort({ likes: -1 }).limit(3).select("titre auteur likes"),

      // 6. les 3 blogs les plus commentés
      Commentaire.aggregate([
        { $group: { _id: "$blog", nbCommentaires: { $sum: 1 } } },
        { $sort: { nbCommentaires: -1 } },
        { $limit: 3 },
        { $lookup: { from: "blogs", localField: "_id", foreignField: "_id", as: "blog" } },
        { $unwind: "$blog" },
        { $project: { _id: 0, titre: "$blog.titre", auteur: "$blog.auteur", nbCommentaires: 1 } },
      ]),

      // 7. les auteurs les plus populaires (total de likes reçus)
      Blog.aggregate([
        {
          $group: {
            _id: "$email",
            auteur: { $first: "$auteur" },
            nbBlogs: { $sum: 1 },
            totalLikes: { $sum: "$likes" },
          },
        },
        { $sort: { totalLikes: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, email: "$_id", auteur: 1, nbBlogs: 1, totalLikes: 1 } },
      ]),

      // 8. les membres qui commentent le plus
      Commentaire.aggregate([
        { $group: { _id: "$email", auteur: { $first: "$auteur" }, nbCommentaires: { $sum: 1 } } },
        { $sort: { nbCommentaires: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, email: "$_id", auteur: 1, nbCommentaires: 1 } },
      ]),

      // 9. nombre de commentaires par jour sur les 7 derniers jours
      Commentaire.aggregate([
        { $match: { createdAt: { $gte: ilYa7Jours } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            nbCommentaires: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, jour: "$_id", nbCommentaires: 1 } },
      ]),
    ]);

    const totalLikes = likes.length ? likes[0].total : 0;
    const moyenneLikes = likes.length ? likes[0].moyenne : 0;

    res.status(200).json({
      totaux: {
        blogs: nbBlogs,
        commentaires: nbCommentaires,
        likes: totalLikes,
      },
      moyennes: {
        likesParBlog: Math.round(moyenneLikes * 10) / 10,
        commentairesParBlog: nbBlogs ? Math.round((nbCommentaires / nbBlogs) * 10) / 10 : 0,
      },
      parCategorie,
      topLikes,
      topCommentes,
      topAuteurs,
      topCommentateurs,
      activite7Jours,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { statsglobales };