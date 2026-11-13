// Traduction avec l'API gratuite MyMemory (pas de clé, pas d'installation)
// Limite : environ 5000 caractères par jour en anonyme, et 500 octets max par requête
// -> on découpe les longs textes en morceaux

const languesAutorisees = ["fr", "en", "ar", "es", "de", "it"];

// découpe un texte en morceaux de moins de 450 octets, en coupant entre les phrases
function decouper(texte) {
  const phrases = texte.split(/(?<=[.!?…])\s+/);
  const morceaux = [];
  let courant = "";
  for (const phrase of phrases) {
    const essai = courant ? courant + " " + phrase : phrase;
    if (Buffer.byteLength(essai) > 450 && courant) {
      morceaux.push(courant);
      courant = phrase;
    } else {
      courant = essai;
    }
  }
  if (courant) morceaux.push(courant);
  return morceaux;
}

// traduit un morceau de texte
async function traduireMorceau(texte, source, cible) {
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(texte) +
    "&langpair=" + source + "|" + cible;

  const reponse = await fetch(url); // fetch est inclus dans Node 18+
  const data = await reponse.json();

  if (Number(data.responseStatus) !== 200) {
    throw new Error("erreur de traduction : " + data.responseDetails);
  }
  return data.responseData.translatedText;
}

// traduit un texte complet (morceau par morceau)
async function traduireTexte(texte, cible, source = "fr") {
  if (!texte) return texte;
  const traductions = [];
  for (const morceau of decouper(texte)) {
    traductions.push(await traduireMorceau(morceau, source, cible));
  }
  return traductions.join(" ");
}

module.exports = { traduireTexte, languesAutorisees };