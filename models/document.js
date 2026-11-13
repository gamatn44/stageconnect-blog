const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
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
      enum: ["brouillon", "publie", "archive"],
      default: "brouillon"
    },
    fichierUrl: {
      type: String,
      trim: true
    },
    dateDocument: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Document || mongoose.model("Document", documentSchema);
