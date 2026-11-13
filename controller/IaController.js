const { demanderGemini } = require("../utils/ia");
const Blog = require("../models/blog");
const Commentaire = require("../models/commentaire");
const Question = require("../models/question");

// les styles de reformulation proposés
const styles = {
  professionnel: "dans un style professionnel et soigné",
  simple: "dans un style simple et facile à comprendre",
  court: "de façon plus courte et concise, en gardant les idées principales",
  corriger: "en corrigeant uniquement les fautes d'orthographe et de grammaire, sans changer le style",
};

// REFORMULATION : POST /ia/reformuler  body : { "texte": "...", "style": "professionnel" }
async function reformuler(req, res) {
  try {
    const { texte, style = "professionnel" } = req.body;
    if (!texte) return res.status(400).json({ message: "le champ texte est obligatoire" });
    if (!styles[style]) {
      return res.status(400).json({ message: "style inconnu", stylesDisponibles: Object.keys(styles) });
    }

    const prompt =
      "Reformule le texte suivant " + styles[style] + ". " +
      "Garde la même langue et le même sens. " +
      "Réponds uniquement avec le texte reformulé, sans introduction ni explication.\n\n" +
      "Texte : " + texte;

    const resultat = await demanderGemini(prompt);
    res.status(200).json({ style, original: texte, reformulation: resultat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// QUESTION-RÉPONSE : POST /ia/question/:idblog
// body : { "question": "...", "auteur": "...", "email": "..." }
// l'IA lit le blog et ses commentaires, puis répond (comme Grok sous un tweet)
async function poserquestion(req, res) {
  try {
    const { question, auteur, email } = req.body;
    if (!question || !auteur || !email) {
      return res.status(400).json({ message: "question, auteur et email sont obligatoires" });
    }

    const blog = await Blog.findById(req.params.idblog);
    if (!blog) return res.status(404).json({ message: "blog introuvable" });

    // les 10 derniers commentaires servent de contexte en plus
    const commentaires = await Commentaire.find({ blog: blog._id }).sort({ createdAt: -1 }).limit(10);
    const listeCommentaires = commentaires.map((c) => "- " + c.auteur + " : " + c.contenu).join("\n");

    const prompt =
      "Tu es StageConnect IA, l'assistant d'un blog sur les stages étudiants. " +
      "Un lecteur pose une question sous un article. " +
      "Réponds en t'appuyant d'abord sur l'article et ses commentaires. " +
      "Si la réponse n'y est pas, tu peux utiliser tes connaissances générales, mais précise-le. " +
      "Réponds en 5 phrases maximum, dans la langue de la question, de façon claire et bienveillante.\n\n" +
      "ARTICLE\nTitre : " + blog.titre + "\nAuteur : " + blog.auteur + "\nContenu : " + blog.contenu + "\n\n" +
      "COMMENTAIRES\n" + (listeCommentaires || "aucun commentaire") + "\n\n" +
      "QUESTION de " + auteur + " : " + question;

    const reponse = await demanderGemini(prompt);

    // on enregistre la question et la réponse
    const q = new Question({ blog: blog._id, question, auteur, email, reponse });
    await q.save();

    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /ia/questions/:idblog : toutes les questions-réponses d'un blog
async function showquestions(req, res) {
  try {
    const questions = await Question.find({ blog: req.params.idblog }).sort({ createdAt: -1 });
    res.status(200).json({ resultats: questions.length, questions });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = { reformuler, poserquestion, showquestions };