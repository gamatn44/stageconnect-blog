// Appel à l'API Gemini (IA de Google)
// La clé et le modèle sont lus dans le fichier .env (jamais écrits dans le code)

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function demanderGemini(prompt, essai = 1) {
  const cle = process.env.GEMINI_API_KEY;
  const modele = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  if (!cle) throw new Error("GEMINI_API_KEY manquante dans le fichier .env");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`;

  const reponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": cle,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await reponse.json();

  // serveur surchargé (503) ou trop de requêtes (429) -> on réessaie jusqu'à 3 fois
  if ((reponse.status === 503 || reponse.status === 429) && essai < 3) {
    console.log("Gemini occupé (" + reponse.status + "), nouvel essai dans " + essai * 2 + " s...");
    await attendre(essai * 2000); // 2 s, puis 4 s
    return demanderGemini(prompt, essai + 1);
  }

  // autre erreur renvoyée par Google (clé invalide, modèle inconnu…)
  if (!reponse.ok) {
    throw new Error("Gemini (" + reponse.status + ") : " + (data.error ? data.error.message : "erreur inconnue"));
  }

  const parts = data.candidates && data.candidates[0] && data.candidates[0].content
    ? data.candidates[0].content.parts
    : [];
  const texte = parts.map((p) => p.text || "").join("").trim();
  if (!texte) throw new Error("Gemini n'a pas renvoyé de réponse");
  return texte;
}

module.exports = { demanderGemini };