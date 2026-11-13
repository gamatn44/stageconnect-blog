const express = require("express");
const controller = require("../controllers/evolution.controller");

const router = express.Router();


router.get("/getlister", controller.lister);
router.post("/postcreer", controller.creer);

router.get("/getobtenir/:id", controller.obtenir);
router.put("/putmodifier/:id", controller.modifier);
router.delete("/deletesupprimer/:id", controller.supprimer);

module.exports = router;
