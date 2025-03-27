// Middlewares/uploadMiddleware.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Definir el directorio de uploads de forma dinámica
const uploadDir = path.join(__dirname, "../uploads");

// Verificar y crear la carpeta de uploads si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración del almacenamiento con multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Se genera un nombre único utilizando la fecha actual y la extensión original
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Filtro de archivos para permitir solo ciertos tipos de imagen
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Formato de archivo no permitido"), false);
  }
};

// Crear el middleware multer con la configuración de almacenamiento y filtro
const upload = multer({ storage, fileFilter });

module.exports = upload;
