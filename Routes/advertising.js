const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const advertisingController = require("../Controllers/advertisingController");
const { verifyToken } = require("../Middlewares/authMiddleware");

// Configurar la carpeta de subida para publicidad
// La carpeta "uploads" está en la raíz de Backend
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// GET: Obtener todas las categorías con sus archivos
router.get("/", verifyToken, advertisingController.getAdvertising);

// POST: Crear nueva categoría
router.post("/category", verifyToken, advertisingController.createCategory);

// PUT: Editar categoría
router.put("/category/:id", verifyToken, advertisingController.updateCategory);

// DELETE: Eliminar categoría (y sus archivos)
router.delete("/category/:id", verifyToken, advertisingController.deleteCategory);

// POST: Subir múltiples archivos (imágenes/videos)
router.post("/upload", verifyToken, upload.array("files"), advertisingController.uploadFiles);

// DELETE: Eliminar un archivo específico
router.delete("/file/:file_id", verifyToken, advertisingController.deleteFile);

module.exports = router;
