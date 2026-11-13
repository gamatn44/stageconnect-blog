const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const twig = require("twig");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

const dbConnection = require("./config/dbconnection.json");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "twig");
app.engine("twig", twig.__express);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const documentationPath = path.join(__dirname, "documentation", "openapi.json");
if (fs.existsSync(documentationPath)) {
  const apiDocumentation = require(documentationPath);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(apiDocumentation));
} else {
  console.warn("Documentation OpenAPI absente : la route /api-docs est désactivée.");
}

const documentRoutes = require("./routes/document");
const evolutionRoutes = require("./routes/evolution");



app.use("/docu/documents", documentRoutes);
app.use("/evol/evolutions", evolutionRoutes);


app.get("/", (req, res) => {
  res.render("index");
});

app.use((req, res) => {
  res.status(404).json({ erreur: "Route introuvable" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.name === "ValidationError" || err.name === "CastError"
    ? 400
    : err.code === 11000
      ? 409
      : err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(err);
  }

  const erreur = status === 500
    ? "Erreur interne du serveur."
    : err.message;

  return res.status(status).json({ erreur });
});

const startServer = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || dbConnection.url;
  if (!mongoUri) {
    throw new Error("La variable d'environnement MONGO_URI est obligatoire.");
  }

  await mongoose.connect(mongoUri);
  console.log("Base de données connectée.");

  const port = process.env.PORT || 3000;
  return app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
  });
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Impossible de démarrer le serveur :", err.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
