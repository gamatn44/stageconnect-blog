var express = require("express");
var router = express.Router();
const blogController = require("../controller/BlogController");
const { verifierModeration } = require("../middlewares/moderation");

router.post("/addblog", verifierModeration, blogController.addblog);
router.get("/showallblog", blogController.showallblog);
router.get("/showblog/:id", blogController.showblog);
router.put("/updateblog/:id", verifierModeration, blogController.updateblog);
router.delete("/deleteblog/:id", blogController.deleteblog);
router.put("/likeblog/:id", blogController.likeblog);
router.get("/search", blogController.searchblog);
router.get("/traduire/:id", blogController.traduireblog);

module.exports = router;