require("dotenv").config(); // lit le fichier .env

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var http = require("http");
const mongo = require("mongoose");
const swaggerUi = require("swagger-ui-express"); // ← AJOUTÉ
const documentation = require("./documentation/openapi.json"); // ← AJOUTÉ

const dbconnect = require("./config/dbconnection.json");

mongo
  .connect(dbconnect.url)
  .then(() => console.log("database connected!!"))
  .catch((err) => console.log(err));

var indexRouter = require("./routes/index");
var blogRouter = require("./routes/blog");
var commentaireRouter = require("./routes/commentaire");
var statsRouter = require("./routes/stats");
var tendancesRouter = require("./routes/tendances");
var auteurRouter = require("./routes/auteur");
var iaRouter = require("./routes/ia");

var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "twig");

// documentation Swagger : http://localhost:3002/api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(documentation)); // ← AJOUTÉ

app.use("/", indexRouter);
app.use("/blog", blogRouter);
app.use("/commentaire", commentaireRouter);
app.use("/stats", statsRouter);
app.use("/tendances", tendancesRouter);
app.use("/auteurs", auteurRouter);
app.use("/ia", iaRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({ message: err.message });
});

const port = process.env.PORT || 3002;
const server = http.createServer(app);
server.listen(port, () => console.log("service blog en mode run sur le port " + port));

module.exports = app;