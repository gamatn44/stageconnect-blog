const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const Document = require("../models/document");
const Evolution = require("../models/evolution");
const documentRoutes = require("../routes/document");
const evolutionRoutes = require("../routes/evolution");

const modules = [
  {
    nom: "Documents",
    Model: Document,
    routes: documentRoutes,
    prefixe: "/api/documents",
    corps: {
      titre: "Guide",
      description: "Documentation de test",
      type: "rapport",
      statut: "brouillon",
      fichierUrl: "https://example.test/guide.pdf"
    },
    filtre: "type=rapport",
    recherche: "Guide",
    chemins: {
      liste: "/getlister",
      creation: "/postcreer",
      lecture: "/getobtenir/abc123",
      modification: "/putmodifier/abc123",
      suppression: "/deletesupprimer/abc123"
    },
    statutSuppression: 200,
    messageSuppression: "Document supprimé avec succès"
  },
  {
    nom: "Évolutions",
    Model: Evolution,
    routes: evolutionRoutes,
    prefixe: "/api/evolutions",
    corps: {
      titre: "Version 2",
      description: "Amélioration de test",
      type: "amelioration",
      statut: "planifiee"
    },
    filtre: "type=amelioration",
    recherche: "Version",
    chemins: {
      liste: "/getlister",
      creation: "/postcreer",
      lecture: "/getobtenir/abc123",
      modification: "/putmodifier/abc123",
      suppression: "/deletesupprimer/abc123"
    },
    statutSuppression: 200,
    messageSuppression: "Évolution supprimée avec succès"
  }
];

for (const module of modules) {
  test(`${module.nom} expose recherche et opérations CRUD`, async (t) => {
    const { Model } = module;
    const originaux = {
      find: Model.find,
      countDocuments: Model.countDocuments,
      create: Model.create,
      findById: Model.findById,
      findByIdAndUpdate: Model.findByIdAndUpdate,
      findByIdAndDelete: Model.findByIdAndDelete
    };
    let entree = { _id: "abc123", ...module.corps };
    let filtreListe;
    let optionsModification;

    Model.find = (filtre) => {
      filtreListe = filtre;
      const requete = {
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return Promise.resolve([entree]);
        }
      };
      return requete;
    };
    Model.countDocuments = async () => 1;
    Model.create = async (corps) => {
      entree = { _id: "abc123", ...corps };
      return entree;
    };
    Model.findById = async (id) => (id === "abc123" ? entree : null);
    Model.findByIdAndUpdate = async (id, update, options) => {
      optionsModification = options;
      if (id !== "abc123") {
        return null;
      }
      entree = { ...entree, ...update.$set };
      return entree;
    };
    Model.findByIdAndDelete = async (id) => {
      if (id !== "abc123") {
        return null;
      }
      const supprime = entree;
      entree = null;
      return supprime;
    };

    t.after(() => {
      Object.assign(Model, originaux);
    });

    const app = express();
    app.use(express.json());
    app.use(module.prefixe, module.routes);
    app.use((erreur, req, res, next) => {
      if (res.headersSent) {
        return next(erreur);
      }
      return res.status(erreur.status || 500).json({ erreur: erreur.message });
    });

    const serveur = app.listen(0, "127.0.0.1");
    t.after(() => new Promise((resolve) => serveur.close(resolve)));
    await new Promise((resolve) => serveur.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${serveur.address().port}${module.prefixe}`;

    const liste = await fetch(
      `${baseUrl}${module.chemins.liste}?page=1&limit=5&search=${module.recherche}&${module.filtre}&sortBy=titre&order=asc`
    );
    assert.equal(liste.status, 200);
    assert.deepEqual(filtreListe.$or[0].titre, {
      $regex: module.recherche,
      $options: "i"
    });
    assert.equal((await liste.json()).pagination.total, 1);

    const creation = await fetch(`${baseUrl}${module.chemins.creation}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(module.corps)
    });
    assert.equal(creation.status, 201);

    const lecture = await fetch(`${baseUrl}${module.chemins.lecture}`);
    assert.equal(lecture.status, 200);

    const modification = await fetch(`${baseUrl}${module.chemins.modification}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Mise à jour" })
    });
    assert.equal(modification.status, 200);
    assert.equal((await modification.json()).description, "Mise à jour");
    assert.deepEqual(optionsModification, {
      returnDocument: "after",
      runValidators: true
    });

    const suppression = await fetch(`${baseUrl}${module.chemins.suppression}`, {
      method: "DELETE"
    });
    assert.equal(suppression.status, module.statutSuppression);
    if (module.messageSuppression) {
      assert.deepEqual(await suppression.json(), {
        message: module.messageSuppression
      });
    }
  });
}
