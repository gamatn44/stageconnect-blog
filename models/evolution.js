const mongoose = require("mongoose");

const evolutionSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    statut: {
      type: String,
      enum: ["planifiee", "en_cours", "terminee", "annulee"],
      default: "planifiee"
    },
    dateEvolution: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Evolution || mongoose.model("Evolution", evolutionSchema);
