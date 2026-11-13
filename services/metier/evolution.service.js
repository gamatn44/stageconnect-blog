const Evolution = require("../../models/evolution");
const { rechercherAvecOptions } = require("./rechercherAvecOptions");

async function rechercherEvolutions(query) {
  return rechercherAvecOptions(Evolution, query, {
    champsRecherche: ["titre", "description"],
    champsFiltres: ["type", "statut", "dateEvolution"],
    champsTri: ["titre", "type", "statut", "dateEvolution", "createdAt"],
    triDefaut: "createdAt"
  });
}

module.exports = { rechercherEvolutions };
