// Tout ce qui concerne les auteurs est regroupé ici.
// Le jour où on intègre la gestion des utilisateurs, c'est ce fichier qu'on adapte.
const crypto = require("crypto");

// ---------- GRAVATAR ----------
// Gravatar donne une photo à partir de l'email : on envoie le "hash" MD5 de l'email
// d=identicon -> si l'email n'a pas de compte Gravatar, on reçoit un motif géométrique unique
function gravatarUrl(email, taille = 200) {
  const hash = crypto
    .createHash("md5")
    .update(String(email).trim().toLowerCase())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${taille}&d=identicon`;
}

// ---------- BADGES ----------
// chaque badge = une condition sur les statistiques de l'auteur
const badges = [
  { code: "premier-article", nom: "Premier article", icone: "✍️", description: "A publié son premier blog", condition: (s) => s.nbBlogs >= 1 },
  { code: "auteur-prolifique", nom: "Auteur prolifique", icone: "📚", description: "A publié au moins 3 blogs", condition: (s) => s.nbBlogs >= 3 },
  { code: "premier-like", nom: "Premier like", icone: "👍", description: "A reçu son premier like", condition: (s) => s.likesRecus >= 1 },
  { code: "populaire", nom: "Populaire", icone: "🔥", description: "A reçu au moins 20 likes", condition: (s) => s.likesRecus >= 20 },
  { code: "star", nom: "Star", icone: "⭐", description: "A reçu au moins 30 likes", condition: (s) => s.likesRecus >= 30 },
  { code: "premier-commentaire", nom: "Premier commentaire", icone: "💬", description: "A écrit son premier commentaire", condition: (s) => s.commentairesEcrits >= 1 },
  { code: "bavard", nom: "Bavard", icone: "🗣️", description: "A écrit au moins 5 commentaires", condition: (s) => s.commentairesEcrits >= 5 },
  { code: "lance-debat", nom: "Lance le débat", icone: "🎤", description: "A reçu au moins 5 commentaires sur ses blogs", condition: (s) => s.commentairesRecus >= 5 },
];

// renvoie la liste des badges gagnés + ceux qui restent à débloquer
function calculerBadges(stats) {
  const gagnes = [];
  const aDebloquer = [];
  badges.forEach(({ condition, ...badge }) => {
    if (condition(stats)) gagnes.push(badge);
    else aDebloquer.push(badge);
  });
  return { gagnes, aDebloquer };
}

module.exports = { gravatarUrl, calculerBadges };