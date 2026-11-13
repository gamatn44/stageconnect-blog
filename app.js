var express = require("express");
var path = require("path");
var logger = require("morgan");
var http = require("http");
const mongo = require("mongoose");

const config = require("./config/dbconnection.json");

// connexion a la base MongoDB du service (candidatures_db)
mongo
  .connect(process.env.MONGO_URL || config.url)
  .then(() => console.log("database connected!!"))
  .catch((err) => {
    console.log(err);
  });

var candidatureRouter = require("./routes/candidatures");
var cvRouter = require("./routes/cvs");

var app = express();
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// les fichiers CV (uploades ou generes) sont accessibles par /uploads/...
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", function (req, res) {
  res.json({ service: "candidatures", status: "UP" });
});

app.use("/candidatures", candidatureRouter);
app.use("/cvs", cvRouter);

// route inconnue
app.use(function (req, res) {
  res.status(404).json({ message: "route introuvable" });
});

// gestion des erreurs (ex : fichier refuse par multer)
app.use(function (err, req, res, next) {
  console.log(err.message);
  res.status(err.status || 400).json({ message: err.message });
});

const port = process.env.PORT || config.port;
const server = http.createServer(app);
server.listen(port, () =>
  console.log("service candidatures en mode run sur le port " + port),
);

module.exports = app;
