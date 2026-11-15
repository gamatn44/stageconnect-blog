const mongo = require("mongoose");
const schema = mongo.Schema;

const Blog = new schema(
  {
    titre: { type: String, required: true },
    contenu: { type: String, required: true },
    auteur: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    categorie: String,
    image: String,
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongo.model("blog", Blog);