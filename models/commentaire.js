const mongo = require("mongoose");
const schema = mongo.Schema;

const Commentaire = new schema(
  {
    contenu: { type: String, required: true },
    auteur: { type: String, required: true },
    email: { type: String, required: true },
    // relation : chaque commentaire appartient à un blog
    blog: { type: schema.Types.ObjectId, ref: "blog", required: true },
  },
  { timestamps: true }
);

module.exports = mongo.model("commentaire", Commentaire);