// Backend/server.js

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const db = require("./Config/db");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { verifyToken, verifyAdmin } = require("./Middlewares/authMiddleware");

// Cargar variables de entorno (se usa el .env adecuado para el entorno de despliegue)
dotenv.config();

const app = express();

// Agregar Helmet para mejorar la seguridad
app.use(helmet());

// Configurar middlewares para parsear JSON y urlencoded
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configuración de CORS: se utiliza FRONTEND_URL del .env o localhost para desarrollo
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: frontendUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Configurar la carpeta de uploads y servir archivos estáticos
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Configuración de Multer para manejo de archivos (imágenes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Formato de archivo no permitido para perfil"), false);
  }
};
const upload = multer({ storage, fileFilter });

// Importar rutas
const userRoutes = require("./Routes/user");
app.use("/api", userRoutes);

const authRoutes = require("./Routes/auth");
app.use("/api/auth", authRoutes);

const advertisingRoutes = require("./Routes/advertising");
app.use("/api/advertising", advertisingRoutes);

const productosRoutes = require("./Routes/productos");
app.use("/api/productos", productosRoutes);

// Rutas para perfil de usuario
app.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [result] = await db.query(
      `SELECT 
          u.user_id, u.name, u.email, u.role, u.phone, u.profile_photo, u.description,
          c.name AS companyName, c.description AS companyDescription, 
          c.location AS companyLocation, c.phone AS companyPhone, c.photo AS companyPhoto
       FROM users u 
       LEFT JOIN companies c ON u.user_id = c.user_id 
       WHERE u.user_id = ?`,
      [userId]
    );
    if (result.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
});

app.put("/api/profile", verifyToken, async (req, res) => {
  const {
    name,
    email,
    description,
    phone,
    profile_photo,
    companyName,
    companyDescription,
    companyLocation,
    companyPhone,
    companyPhoto,
  } = req.body;
  const userId = req.user.user_id;
  try {
    await db.query(
      `UPDATE users SET name = ?, email = ?, description = ?, phone = ?, profile_photo = ? WHERE user_id = ?`,
      [name, email, description, phone, profile_photo, userId]
    );
    const [existingCompany] = await db.query("SELECT * FROM companies WHERE user_id = ?", [userId]);
    if (existingCompany.length > 0) {
      await db.query(
        `UPDATE companies SET name = ?, description = ?, location = ?, phone = ?, photo = ? WHERE user_id = ?`,
        [companyName, companyDescription, companyLocation, companyPhone, companyPhoto, userId]
      );
    } else {
      await db.query(
        `INSERT INTO companies (user_id, name, description, location, phone, photo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, companyName, companyDescription, companyLocation, companyPhone, companyPhoto]
      );
    }
    res.status(200).json({ message: "Perfil y empresa actualizados exitosamente." });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
});

// Ruta para subir archivos/imágenes (con token)
// Se utiliza BACKEND_URL desde el .env o localhost por defecto para construir la URL de la imagen
app.post("/api/upload", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se subió ninguna imagen." });
  }
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  const imageUrl = `${backendUrl}/uploads/${req.file.filename}`;
  const userId = req.user.user_id;
  try {
    await db.query("UPDATE users SET profile_photo = ? WHERE user_id = ?", [imageUrl, userId]);
    res.status(200).json({ message: "Imagen subida correctamente", fileUrl: imageUrl });
  } catch (error) {
    console.error("Error al subir la imagen:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
});

// Rutas para administración de usuarios (ejemplo)
app.get("/api/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [users] = await db.query("SELECT user_id, name, email, role FROM users");
    res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
});

app.delete("/api/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const userIdParam = req.params.id;
  if (req.user.user_id == userIdParam) {
    return res.status(403).json({ message: "No puedes eliminar tu propia cuenta." });
  }
  try {
    const [user] = await db.query("SELECT * FROM users WHERE user_id = ?", [userIdParam]);
    if (user.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    await db.query("DELETE FROM users WHERE user_id = ?", [userIdParam]);
    res.status(200).json({ message: "Usuario eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
});

// Manejo global de excepciones y rechazos no manejados
process.on("uncaughtException", (err) => {
  console.error("Excepción no manejada:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Promesa rechazada sin manejar:", reason);
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
