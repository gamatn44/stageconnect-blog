var express = require("express");
var router = express.Router();
const iaController = require("../controller/IaController");
const { verifierModeration } = require("../middlewares/moderation");

router.post("/reformuler", iaController.reformuler);
router.post("/question/:idblog", verifierModeration, iaController.poserquestion);
router.get("/questions/:idblog", iaController.showquestions);

module.exports = router;