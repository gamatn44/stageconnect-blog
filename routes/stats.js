var express = require("express");
var router = express.Router();
const statsController = require("../controller/StatsController");

router.get("/", statsController.statsglobales);

module.exports = router;