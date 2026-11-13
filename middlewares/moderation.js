// Liste des mots/expressions interdits (on peut en ajouter)
const motsInterdits = ["ca ya dawla"];

// Met le texte en minuscules, enlève les accents et la ponctuation
// -> "Ça-YA dawla !" devient " ca ya dawla "
function normaliser(texte) {
  return (
    " " +
    String(texte)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // enlève les accents
      .replace(/[^a-z0-9]+/g, " ") // remplace la ponctuation par des espaces
      .trim() +
    " "
  );
}

// Renvoie le mot interdit trouvé, ou undefined si le texte est propre
function trouverMotInterdit(texte) {
  const texteNormalise = normaliser(texte);
  return motsInterdits.find((mot) => texteNormalise.includes(normaliser(mot)));
}

// Middleware : vérifie le titre et le contenu avant d'aller au controller
function verifierModeration(req, res, next) {
  const champs = ["titre", "contenu", "question"];

  for (const champ of champs) {
    if (req.body[champ]) {
      const mot = trouverMotInterdit(req.body[champ]);
      if (mot) {
        return res.status(400).json({
          message: "contenu refusé par la modération",
          champ: champ,
          motInterdit: mot,
        });
      }
    }
  }
  next(); // texte propre -> on passe au controller
}

module.exports = { verifierModeration, trouverMotInterdit };