// Script de remplissage de la base avec des données de démonstration
// Lancer avec :  node seed.js
// ATTENTION : il SUPPRIME tous les blogs et commentaires existants avant de remplir.

const mongo = require("mongoose");
const dbconnect = require("./config/dbconnection.json");
const Blog = require("./models/blog");
const Commentaire = require("./models/commentaire");

// date il y a X jours (pour avoir des posts à des dates différentes -> utile pour les tendances)
function ilYa(jours) {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
}

// les auteurs (identifiés par leur email)
const amine = { auteur: "Mohamed Amine Allouche", email: "amine.allouche@example.com" };
const sarra = { auteur: "Sarra Ben Hassine", email: "sarra.benhassine@example.com" };
const nada = { auteur: "Nada Hmaied", email: "nada.hmaied@example.com" };
const chaima = { auteur: "Chaima Chebbi", email: "chaima.chebbi@example.com" };
const nour = { auteur: "Nour Islem Loukil", email: "nour.loukil@example.com" };
const mahat = { auteur: "Mahat Ali Djaba", email: "mahat.djaba@example.com" };

const blogs = [
  {
    ...amine,
    titre: "Réussir son entretien de stage",
    contenu:
      "Préparer un entretien de stage, c'est d'abord bien connaître l'entreprise. Renseignez-vous sur ses projets, préparez 2 ou 3 exemples concrets de vos réalisations et entraînez-vous à présenter votre parcours en 2 minutes. Pensez aussi à préparer des questions à poser au recruteur.",
    categorie: "Conseils",
    likes: 24,
    createdAt: ilYa(2),
  },
  {
    ...sarra,
    titre: "Mon premier stage en développement web",
    contenu:
      "J'ai passé 3 mois dans une startup à Tunis comme développeuse full-stack. J'ai travaillé avec Node.js, Express et MongoDB. Le plus difficile a été de comprendre un code existant, mais l'équipe était très disponible. Je recommande vivement les startups pour apprendre vite.",
    categorie: "Expérience de stage",
    likes: 17,
    createdAt: ilYa(5),
  },
  {
    ...nada,
    titre: "Comment rédiger un CV qui attire l'attention",
    contenu:
      "Un bon CV tient sur une page. Mettez en avant vos projets académiques et personnels, avec les technologies utilisées. Adaptez votre CV à chaque offre en reprenant les mots-clés de l'annonce. Et surtout : relisez-vous pour éviter les fautes d'orthographe !",
    categorie: "Conseils",
    likes: 31,
    createdAt: ilYa(1),
  },
  {
    ...chaima,
    titre: "Stage en data science : ce que j'ai appris",
    contenu:
      "Pendant mon stage en data science, j'ai découvert que 80% du travail consiste à nettoyer les données. J'ai utilisé Python, pandas et scikit-learn pour construire un modèle de prédiction. Mon conseil : maîtrisez bien les bases de SQL avant de commencer.",
    categorie: "Expérience de stage",
    likes: 9,
    createdAt: ilYa(10),
  },
  {
    ...nour,
    titre: "Les erreurs à éviter pendant un stage",
    contenu:
      "Ne pas poser de questions par peur de déranger, arriver en retard, ne pas prendre de notes… Voici les erreurs les plus fréquentes que font les stagiaires. Un stage est une période d'apprentissage : montrez votre motivation et demandez des retours réguliers à votre encadrant.",
    categorie: "Conseils",
    likes: 12,
    createdAt: ilYa(20),
  },
];

// commentaires : [index du blog, auteur, contenu, il y a X jours]
const commentaires = [
  [0, sarra, "Merci pour ces conseils, très utile avant mon entretien de lundi !", 2],
  [0, nada, "Le conseil sur les questions à poser au recruteur est vraiment important.", 2],
  [0, chaima, "Je rajouterais : arriver 10 minutes en avance.", 1],
  [0, mahat, "Super article, je le partage avec ma promo.", 1],
  [0, nour, "Est-ce qu'il faut préparer des questions techniques aussi ?", 1],
  [0, sarra, "Grâce à toi j'ai eu mon stage, merci !", 0],
  [0, chaima, "Très clair et bien structuré.", 0],

  [1, amine, "Quelle startup ? Je cherche un stage dans le même domaine.", 4],
  [1, nada, "Node.js et MongoDB, exactement ce qu'on fait en cours !", 4],
  [1, mahat, "Combien de temps pour être à l'aise avec le code existant ?", 3],
  [1, chaima, "Je confirme, en startup on apprend très vite.", 3],
  [1, nour, "Merci pour ce retour d'expérience.", 2],

  [2, amine, "Une seule page, vraiment ? Même avec beaucoup de projets ?", 1],
  [2, sarra, "Le conseil des mots-clés de l'annonce marche vraiment bien.", 1],
  [2, chaima, "Il faut mettre une photo sur le CV ou pas ?", 1],
  [2, mahat, "Très bon article, j'ai refait mon CV grâce à toi.", 0],
  [2, nour, "Tu peux partager un modèle de CV ?", 0],
  [2, amine, "Les fautes d'orthographe, c'est éliminatoire, je confirme.", 0],
  [2, sarra, "Merci Nada, super utile !", 0],
  [2, chaima, "Je l'ajoute à mes favoris.", 0],

  [3, amine, "80% de nettoyage, c'est tellement vrai !", 9],
  [3, nada, "Tu as utilisé quel type de modèle ?", 8],
  [3, sarra, "Merci pour le conseil sur SQL.", 7],
  [3, nour, "Ça donne envie de faire de la data science.", 6],

  [4, amine, "Demander des retours réguliers, c'est la clé.", 19],
  [4, sarra, "J'ai fait l'erreur de ne pas prendre de notes au début…", 18],
  [4, mahat, "Très bonne liste, merci.", 15],
  [4, nada, "On devrait lire ça avant chaque stage.", 12],
];

async function seed() {
  try {
    await mongo.connect(dbconnect.url);
    console.log("database connected!!");

    // 1. on vide les collections
    await Commentaire.deleteMany({});
    await Blog.deleteMany({});
    console.log("anciens blogs et commentaires supprimés");

    // 2. on ajoute les blogs
    const blogsCrees = await Blog.insertMany(blogs);
    console.log(blogsCrees.length + " blogs ajoutés");

    // 3. on ajoute les commentaires en les reliant aux blogs créés
    const listeCommentaires = commentaires.map(([indexBlog, personne, contenu, jours]) => ({
      ...personne,
      contenu,
      blog: blogsCrees[indexBlog]._id,
      createdAt: ilYa(jours),
    }));
    const commentairesCrees = await Commentaire.insertMany(listeCommentaires);
    console.log(commentairesCrees.length + " commentaires ajoutés");
  } catch (err) {
    console.log(err);
  } finally {
    await mongo.disconnect();
    console.log("terminé !");
  }
}

seed();