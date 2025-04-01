const express = require("express");
const { verifyToken, verifyAdmin } = require("../Middlewares/authMiddleware");
const db = require("../Config/db");

const router = express.Router();

// Actualizar perfil (solo el propio usuario o admin)
router.put("/update-profile", verifyToken, async (req, res) => {
  const { name, email, phone, description, profile_photo, company_id, company_name, companyLocation, companyPhone } = req.body;
  // Se utiliza el id del token para identificar al usuario
  const userId = req.user.user_id;

  if (String(req.user.user_id) !== String(userId) && req.user.role !== "admin") {
    return res.status(403).json({ message: "No tienes permiso para modificar este perfil" });
  }

  try {
    await db.query(
      `UPDATE users 
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           description = COALESCE(?, description),
           profile_photo = COALESCE(?, profile_photo)
       WHERE user_id = ?`,
      [name, email, phone, description, profile_photo, userId]
    );

    if (company_id && company_name) {
      await db.query(
        `UPDATE companies 
         SET name = COALESCE(?, name),
             location = COALESCE(?, location),
             phone = COALESCE(?, phone),
             photo = COALESCE(?, photo)
         WHERE company_id = ?`,
        [company_name, companyLocation, companyPhone, profile_photo, company_id]
      );
    }

    return res.status(200).json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
});

// Eliminar usuario (solo admin o el propio usuario)
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [[user]] = await db.query("SELECT * FROM users WHERE user_id = ?", [id]);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (req.user.role !== "admin" && String(req.user.user_id) !== String(id)) {
      return res.status(403).json({ message: "No tienes permiso para eliminar este usuario." });
    }

    await db.query("DELETE FROM companies WHERE user_id = ?", [id]);
    await db.query("DELETE FROM users WHERE user_id = ?", [id]);

    return res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
});

module.exports = router;
