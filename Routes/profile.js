import express from 'express';
import { verifyToken } from '../Middlewares/authMiddleware';
import db from '../Config/db';
import { updateProfile } from '../Controllers/updateProfile';
import upload from "../Middlewares/uploadMiddleware";

const router = express.Router();

// Obtener la URL base del backend a partir de la variable de entorno o localhost por defecto
const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

// Ruta para subir imagen de perfil
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se pudo subir la imagen" });
  }
  const fileUrl = `${backendUrl}/uploads/${req.file.filename}`;
  return res.json({ fileUrl });
});

/**
 * 📌 Obtener perfil del usuario autenticado
 */
router.get('/profile', verifyToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    console.log(`📌 Consultando perfil del usuario ID: ${userId}`);

    // Consultar datos del usuario
    const [userRows] = await db.query(
      `SELECT user_id, name, email, phone, description, profile_photo
       FROM users 
       WHERE user_id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Consultar datos de la empresa
    const [companyRows] = await db.query(
      `SELECT name AS companyName, description AS companyDescription, 
              location AS companyLocation, phone AS companyPhone, photo AS companyPhoto
       FROM companies 
       WHERE user_id = ?`,
      [userId]
    );

    // Construcción del objeto de respuesta
    const userData = {
      user_id: userRows[0].user_id,
      name: userRows[0].name || "",
      email: userRows[0].email || "",
      phone: userRows[0].phone || "",
      description: userRows[0].description || "",
      profile_photo: userRows[0].profile_photo || "",
      companyInfo: companyRows.length > 0 ? companyRows[0] : {
        companyName: "",
        companyDescription: "",
        companyLocation: "",
        companyPhone: "",
        companyPhoto: "",
      }
    };

    console.log("✅ Perfil obtenido:", userData);
    return res.json(userData);
  } catch (error) {
    console.error("❌ Error al obtener el perfil:", error);
    return res.status(500).json({ message: 'Error al obtener los datos del perfil' });
  }
});

/**
 * 📌 Actualizar perfil del usuario
 * Usa el controlador `updateProfile` que maneja la lógica de actualización.
 */
router.put('/profile', verifyToken, updateProfile);

export default router;
