const mongoose = require('mongoose');
const config = require('../config/discord.config');

const tronquer = (texte, max) => {
  const s = String(texte ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

// Construit l'embed à partir d'une liste blanche de champs : action, utilisateur (nom, email),
// description et date. Aucun mot de passe, code ou token n'est jamais lu ni transmis.
const construireEmbed = (historique, user) => ({
  title: tronquer(historique.action, 256),
  color: config.couleurParAction[historique.action] ?? config.couleurs.bleu,
  description: tronquer(historique.description || 'Aucune description', 1000),
  fields: [
    {
      name: 'Utilisateur',
      value: tronquer(user ? `${user.prenom} ${user.nom}` : 'Utilisateur introuvable', 1024),
      inline: true,
    },
    { name: 'Email', value: tronquer(user ? user.email : '—', 1024), inline: true },
  ],
  timestamp: new Date(historique.date || Date.now()).toISOString(),
  footer: { text: 'StageConnect' },
});

// L'URL du webhook est un secret : on la masque si elle apparaît dans un message d'erreur.
const masquer = (message) => {
  const texte = String(message);
  return config.webhookUrl ? texte.split(config.webhookUrl).join('[webhook]') : texte;
};

// Envoie un embed sur le webhook Discord. Ne lève jamais d'erreur et ne doit jamais bloquer
// la requête : timeout de 5 s, les échecs sont seulement loggués.
const envoyerEmbed = async (embed) => {
  try {
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'StageConnect',
        embeds: [embed],
        allowed_mentions: { parse: [] }, // aucun @everyone / @utilisateur déclenché par un nom ou une description
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!res.ok) console.error(`[DISCORD] Envoi refusé (HTTP ${res.status})`);
  } catch (err) {
    const raison = err.name === 'TimeoutError' ? `délai de ${config.timeoutMs / 1000} s dépassé` : masquer(err.message);
    console.error(`[DISCORD] Échec de l'envoi : ${raison}`);
  }
};

// Archive une entrée d'historique sur Discord (si son action est dans la liste configurée).
// À appeler SANS await depuis le hook du modèle : la fonction gère elle-même toutes ses erreurs.
exports.archiverHistorique = async (historique) => {
  try {
    if (!config.actionsArchivees.includes(historique.action)) return;

    const user = await mongoose.model('User').findById(historique.user).select('nom prenom email');

    if (!config.webhookUrl) {
      console.log(
        `[DISCORD - désactivé] ${historique.action} | ${user ? user.email : 'utilisateur introuvable'} | ${historique.description || ''}`
      );
      return;
    }
    await envoyerEmbed(construireEmbed(historique, user));
  } catch (err) {
    console.error(`[DISCORD] Archivage impossible : ${masquer(err.message)}`);
  }
};

exports.construireEmbed = construireEmbed;
