// Backend/server.js

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const db = require("./Config/db");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { verifyToken, verifyAdmin } = require("./Middlewares/authMiddleware");

dotenv.config();

const app = express();

// Middlewares de parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Middleware global para CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    return res.status(200).json({});
  }
  next();
});

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Configuración para servir archivos estáticos (uploads)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir la carpeta /uploads como estático
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    next();
  },
  express.static(uploadDir)
);

// Configuración de Multer para manejo de archivos (imágenes, etc.)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Formato de archivo no permitido para perfil"), false);
  }
};
const upload = multer({ storage, fileFilter });

// IMPORTAR rutas de usuario (signup, login, etc.)
const userRoutes = require("./Routes/user");
app.use("/api", userRoutes);

// IMPORTAR y montar las rutas de autenticación (incluye validate-password)
const authRoutes = require("./Routes/auth");
app.use("/api/auth", authRoutes);

// Rutas adicionales (publicidad, productos, etc.)
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
      `UPDATE users SET name = ?, email = ?, description = ?, phone = ?, profile_photo = ?
       WHERE user_id = ?`,
      [name, email, description, phone, profile_photo, userId]
    );
    const [existingCompany] = await db.query("SELECT * FROM companies WHERE user_id = ?", [userId]);
    if (existingCompany.length > 0) {
      await db.query(
        `UPDATE companies 
         SET name = ?, description = ?, location = ?, phone = ?, photo = ?
         WHERE user_id = ?`,
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

// Ejemplo de subir archivos/imágenes (con token)
app.post("/api/upload", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se subió ninguna imagen." });
  }
  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
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
  const userId = req.params.id;
  if (req.user.user_id == userId) {
    return res.status(403).json({ message: "No puedes eliminar tu propia cuenta." });
  }
  try {
    const [user] = await db.query("SELECT * FROM users WHERE user_id = ?", [userId]);
    if (user.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    await db.query("DELETE FROM users WHERE user_id = ?", [userId]);
    res.status(200).json({ message: "Usuario eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
