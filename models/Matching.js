const mongoose = require('mongoose');

const matchingSchema = new mongoose.Schema({
  etudiantId: { type: String, required: true },
  offreId: { type: String, required: true },
  score: { type: Number, required: true },
  estElimine: { type: Boolean, default: false },
  raisonElimination: { type: String, default: null },
  isBoosted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Matching', matchingSchema);
