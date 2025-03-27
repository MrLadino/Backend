const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../Config/db");
const dotenv = require("dotenv");
const { verifyToken, verifyAdmin } = require("../Middlewares/authMiddleware");

dotenv.config();
const router = express.Router();
const ADMIN_CODE = process.env.ADMIN_CODE || "TicUser001";

// REGISTRO DE USUARIO
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, adminPassword } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Nombre, email, contraseña y rol son obligatorios." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    if (role === "admin" && (!adminPassword || adminPassword.trim() !== ADMIN_CODE.trim())) {
      return res.status(400).json({ message: "Contraseña de Admin incorrecta." });
    }

    const [[existingUser]] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );

    const token = jwt.sign({ user_id: result.insertId, email, role }, process.env.JWT_SECRET, { expiresIn: "30d" });

    return res.status(201).json({ message: "Usuario registrado exitosamente.", token });
  } catch (error) {
    console.error("Error en el registro:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
});

// LOGIN DE USUARIO
router.post("/login", async (req, res) => {
  try {
    const { email, password, role, adminPassword } = req.body;

    const [[user]] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado." });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: `Rol incorrecto. Tu cuenta está registrada como ${user.role}` });
    }

    if (role === "admin" && (!adminPassword || adminPassword.trim() !== ADMIN_CODE.trim())) {
      return res.status(400).json({ message: "Contraseña de Admin incorrecta." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta." });
    }

    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

    return res.status(200).json({ message: "Login exitoso", token, user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Error en el login:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
});

// OBTENER TODOS LOS USUARIOS (solo admins)
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [users] = await db.query("SELECT user_id, name, email, role, phone, description, profile_photo FROM users");
    return res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
});

// ACTUALIZAR PERFIL
router.put("/update-profile", verifyToken, async (req, res) => {
  const { user_id, name, email, phone, description, profile_photo, company_id, company_name, companyLocation, companyPhone } = req.body;

  if (String(req.user.user_id) !== String(user_id) && req.user.role !== "admin") {
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
      [name, email, phone, description, profile_photo, user_id]
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

// ELIMINAR USUARIO
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
