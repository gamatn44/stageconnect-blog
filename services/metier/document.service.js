const Document = require("../../models/document");
const { rechercherAvecOptions } = require("./rechercherAvecOptions");

async function rechercherDocuments(query) {
  return rechercherAvecOptions(Document, query, {
    champsRecherche: ["titre", "description"],
    champsFiltres: ["type", "statut", "dateDocument"],
    champsTri: ["titre", "type", "statut", "dateDocument", "createdAt"],
    triDefaut: "createdAt"
  });
}

module.exports = { rechercherDocuments };
