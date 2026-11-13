var express = require("express");
var router = express.Router();
const tendancesController = require("../controller/TendancesController");

router.get("/blogs", tendancesController.blogstendance);
router.get("/categories", tendancesController.categoriestendance);
router.get("/mots", tendancesController.motstendance);

module.exports = router;