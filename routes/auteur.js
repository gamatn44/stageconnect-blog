var express = require("express");
var router = express.Router();
const auteurController = require("../controller/AuteurController");

router.get("/", auteurController.showallauteurs);
router.get("/:email", auteurController.showauteur);

module.exports = router;