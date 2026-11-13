const Blog = require("../models/blog");
const Commentaire = require("../models/commentaire");

const UN_JOUR = 24 * 60 * 60 * 1000;

// date de début de la période (par défaut : 7 derniers jours)
function debutPeriode(req) {
  const jours = Number(req.query.jours) || 7;
  return { jours, depuis: new Date(Date.now() - jours * UN_JOUR) };
}

// 1. BLOGS EN TENDANCE
// score = (likes + 3 x commentaires récents) / (âge en jours + 2)^1.5
// -> un blog récent et actif passe devant un vieux blog, même très liké
async function blogstendance(req, res) {
  try {
    const { jours, depuis } = debutPeriode(req);

    const [blogs, commentairesRecents] = await Promise.all([
      Blog.find().select("titre auteur categorie likes createdAt"),
      Commentaire.aggregate([
        { $match: { createdAt: { $gte: depuis } } },
        { $group: { _id: "$blog", nb: { $sum: 1 } } },
      ]),
    ]);

    // { idBlog: nombre de commentaires récents }
    const nbParBlog = {};
    commentairesRecents.forEach((c) => (nbParBlog[c._id.toString()] = c.nb));

    const resultat = blogs
      .map((b) => {
        const nbCommentaires = nbParBlog[b._id.toString()] || 0;
        const ageJours = (Date.now() - b.createdAt) / UN_JOUR;
        const score = (b.likes + 3 * nbCommentaires) / Math.pow(ageJours + 2, 1.5);
        return {
          _id: b._id,
          titre: b.titre,
          auteur: b.auteur,
          categorie: b.categorie,
          likes: b.likes,
          commentairesRecents: nbCommentaires,
          publieIlYa: Math.floor(ageJours) + " jour(s)",
          score: Math.round(score * 100) / 100,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.status(200).json({ periode: jours + " derniers jours", tendances: resultat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// 2. CATÉGORIES EN TENDANCE (nombre de commentaires récents par catégorie)
async function categoriestendance(req, res) {
  try {
    const { jours, depuis } = debutPeriode(req);

    const resultat = await Commentaire.aggregate([
      { $match: { createdAt: { $gte: depuis } } },
      { $lookup: { from: "blogs", localField: "blog", foreignField: "_id", as: "blog" } },
      { $unwind: "$blog" },
      { $group: { _id: "$blog.categorie", commentairesRecents: { $sum: 1 } } },
      { $sort: { commentairesRecents: -1 } },
      { $project: { _id: 0, categorie: "$_id", commentairesRecents: 1 } },
    ]);

    res.status(200).json({ periode: jours + " derniers jours", tendances: resultat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// 3. MOTS EN TENDANCE (mots les plus utilisés dans les blogs et commentaires récents)
const motsVides = [
  "les", "des", "une", "est", "pour", "dans", "avec", "que", "qui", "pas", "sur", "par",
  "plus", "aux", "son", "ses", "vos", "nos", "votre", "notre", "mais", "tout", "tous",
  "bien", "aussi", "très", "fait", "faire", "cette", "ces", "comme", "avant", "elle", "il",
  "ils", "vous", "nous", "mon", "ton", "mes", "tes", "être", "avoir", "été", "sont", "ont",
  "merci", "même", "quel", "quelle", "faut", "peut", "c'est", "j'ai", "d'un", "d'une",
  "l'on", "qu'il", "n'est", "toi", "moi", "ici", "là", "car", "donc", "alors", "entre",
];

async function motstendance(req, res) {
  try {
    const { jours, depuis } = debutPeriode(req);

    const [blogs, commentaires] = await Promise.all([
      Blog.find({ createdAt: { $gte: depuis } }).select("titre contenu"),
      Commentaire.find({ createdAt: { $gte: depuis } }).select("contenu"),
    ]);

    // on met tous les textes ensemble
    const texte = [
      ...blogs.map((b) => b.titre + " " + b.contenu),
      ...commentaires.map((c) => c.contenu),
    ].join(" ");

    // on découpe en mots et on compte
    const compteur = {};
    texte
      .toLowerCase()
      .split(/[^a-zà-ÿ0-9'+#]+/i)
      .filter((mot) => mot.length > 3 && !motsVides.includes(mot))
      .forEach((mot) => (compteur[mot] = (compteur[mot] || 0) + 1));

    const top = Object.entries(compteur)
      .map(([mot, occurrences]) => ({ mot, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    res.status(200).json({ periode: jours + " derniers jours", tendances: top });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { blogstendance, categoriestendance, motstendance };