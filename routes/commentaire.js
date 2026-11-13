var express = require("express");
var router = express.Router();
const commentaireController = require("../controller/CommentaireController");
const { verifierModeration } = require("../middlewares/moderation");

router.post("/addcommentaire", verifierModeration, commentaireController.addcommentaire); // ← MODIFIÉ
router.get("/showallcommentaire", commentaireController.showallcommentaire);
router.get("/showcommentaire/:id", commentaireController.showcommentaire);
router.get("/byblog/:idblog", commentaireController.showcommentairesbyblog);
router.put("/updatecommentaire/:id", verifierModeration, commentaireController.updatecommentaire); // ← MODIFIÉ
router.delete("/deletecommentaire/:id", commentaireController.deletecommentaire);
router.get("/traduire/:id", commentaireController.traduirecommentaire);

module.exports = router;