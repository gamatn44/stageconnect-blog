require("dotenv").config(); // lit le fichier .env

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var http = require("http");
const mongo = require("mongoose");

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

const server = http.createServer(app);
server.listen(3000, () => console.log("notre server en mode run!!!"));

module.exports = app;