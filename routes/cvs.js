var express = require("express");
var router = express.Router();
const path = require("path");
const multer = require("multer");
const cvController = require("../controller/CvController");

// configuration de l'upload : PDF, Word ou image, 5 Mo maximum
const extensionsAutorisees = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: function (req, file, cb) {
    // on garde l'extension du fichier d'origine (.pdf, .docx, ...)
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, "cv-" + Date.now() + extension);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!extensionsAutorisees.includes(extension)) {
      return cb(
        new Error("formats acceptes : " + extensionsAutorisees.join(", ")),
      );
    }
    cb(null, true);
  },
});

// statistiques (avant "/:id")
router.get("/stats", cvController.statscv);

// CRUD (+ pagination, tri, filtre, recherche sur la liste)
router.post("/", cvController.addcv);
router.get("/", cvController.showallcv);
router.get("/:id", cvController.showcv);
router.put("/:id", cvController.updatecv);
router.delete("/:id", cvController.deletecv);

// upload du fichier CV (PDF, Word ou image)
router.post("/:id/upload", upload.single("fichier"), cvController.uploadcv);

// metier : generation automatique du CV PFE
router.get("/:id/generer", cvController.generercv);

module.exports = router;
