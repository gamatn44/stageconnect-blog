const assert = require("node:assert/strict");
const test = require("node:test");
const Document = require("../models/document");
const Evolution = require("../models/evolution");

test("Document exige titre et type, et applique les valeurs par défaut", async () => {
  const document = new Document({ titre: "  Guide  ", type: "rapport" });
  await document.validate();

  assert.equal(document.titre, "Guide");
  assert.equal(document.description, "");
  assert.equal(document.statut, "brouillon");
  assert.ok(document.dateDocument instanceof Date);

  await assert.rejects(
    new Document({ type: "rapport" }).validate(),
    { name: "ValidationError" }
  );
});

test("Document refuse un statut hors enum", async () => {
  const document = new Document({
    titre: "Guide",
    type: "rapport",
    statut: "inconnu"
  });

  await assert.rejects(
    document.validate(),
    (erreur) => erreur.name === "ValidationError" && Boolean(erreur.errors.statut)
  );
});

test("Évolution applique ses champs et statut par défaut", async () => {
  const evolution = new Evolution({ titre: "Version 2", type: "amelioration" });
  await evolution.validate();

  assert.equal(evolution.statut, "planifiee");
  assert.equal(evolution.description, "");
  assert.ok(evolution.dateEvolution instanceof Date);
});

test("Évolution refuse un statut hors enum", async () => {
  const evolution = new Evolution({
    titre: "Version 2",
    type: "amelioration",
    statut: "inconnu"
  });

  await assert.rejects(
    evolution.validate(),
    (erreur) => erreur.name === "ValidationError" && Boolean(erreur.errors.statut)
  );
});
