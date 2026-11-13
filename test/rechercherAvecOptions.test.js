const assert = require("node:assert/strict");
const test = require("node:test");
const { rechercherAvecOptions } = require("../services/metier/rechercherAvecOptions");

function creerModelFactice(resultats = [], total = resultats.length) {
  const requete = {
    filtre: undefined,
    tri: undefined,
    decalage: undefined,
    limite: undefined
  };

  return {
    requete,
    Model: {
      find(filtre) {
        requete.filtre = filtre;
        return {
          sort(tri) {
            requete.tri = tri;
            return this;
          },
          skip(decalage) {
            requete.decalage = decalage;
            return this;
          },
          limit(limite) {
            requete.limite = limite;
            return Promise.resolve(resultats);
          }
        };
      },
      countDocuments(filtre) {
        assert.deepEqual(filtre, requete.filtre);
        return Promise.resolve(total);
      }
    }
  };
}

const options = {
  champsRecherche: ["titre", "description"],
  champsFiltres: ["statut"],
  champsTri: ["createdAt", "titre"],
  triDefaut: "createdAt"
};

test("combine recherche, filtres, tri et pagination", async () => {
  const { Model, requete } = creerModelFactice([{ titre: "Dossier" }], 21);

  const resultat = await rechercherAvecOptions(
    Model,
    {
      search: "a.b",
      statut: "actif",
      page: "2",
      limit: "10",
      sortBy: "titre",
      order: "asc"
    },
    options
  );

  assert.deepEqual(requete.filtre, {
    $or: [
      { titre: { $regex: "a\\.b", $options: "i" } },
      { description: { $regex: "a\\.b", $options: "i" } }
    ],
    statut: "actif"
  });
  assert.deepEqual(requete.tri, { titre: 1 });
  assert.equal(requete.decalage, 10);
  assert.equal(requete.limite, 10);
  assert.deepEqual(resultat, {
    resultats: [{ titre: "Dossier" }],
    pagination: { total: 21, page: 2, limit: 10, totalPages: 3 }
  });
});

test("rejette les paramètres de pagination, tri et filtres hors liste blanche", async () => {
  const { Model } = creerModelFactice();

  await assert.rejects(
    rechercherAvecOptions(Model, { limit: "101" }, options),
    { status: 400 }
  );
  await assert.rejects(
    rechercherAvecOptions(Model, { sortBy: "motDePasse" }, options),
    { status: 400 }
  );
  await assert.rejects(
    rechercherAvecOptions(Model, { inconnu: "valeur" }, options),
    { status: 400 }
  );
  await assert.rejects(
    rechercherAvecOptions(Model, { statut: { $ne: "inactif" } }, options),
    { status: 400 }
  );
});
