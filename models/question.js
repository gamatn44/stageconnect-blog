const mongo = require("mongoose");
const schema = mongo.Schema;

// une question posée sous un blog + la réponse de l'IA
const Question = new schema(
  {
    blog: { type: schema.Types.ObjectId, ref: "blog", required: true },
    question: { type: String, required: true },
    auteur: { type: String, required: true },
    email: { type: String, required: true },
    reponse: String, // réponse générée par l'IA
  },
  { timestamps: true }
);

module.exports = mongo.model("question", Question);