// Backend/Controllers/authController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../Config/db.js";
import dotenv from "dotenv";
import { sendMail } from "../utils/emailSender.js";
import crypto from "crypto";

dotenv.config();
const { JWT_SECRET = "por_favor_cambia_este_secreto" } = process.env;

/**
 * OLVIDÉ MI CONTRASEÑA
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "El correo es obligatorio." });
    }

    const [rows] = await db.query("SELECT user_id, email FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No existe un usuario con ese correo." });
    }
    const user = rows[0];

    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db.query("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)", [
      user.user_id,
      token,
      expires,
    ]);

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Restablecer Contraseña - TIC Americas",
      html: `
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace o pégalo en tu navegador:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Este enlace expira en 1 hora.</p>
      `,
    });

    return res.json({
      message: "Se ha enviado un correo con instrucciones para restablecer tu contraseña.",
    });
  } catch (error) {
    console.error("Error en forgotPassword:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
};

/**
 * RESETEAR CONTRASEÑA
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token y nueva contraseña son obligatorios." });
    }

    const [rows] = await db.query("SELECT * FROM password_resets WHERE token = ?", [token]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Token inválido o inexistente." });
    }
    const resetRecord = rows[0];

    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ message: "El token ha expirado." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE user_id = ?", [hashed, resetRecord.user_id]);
    await db.query("DELETE FROM password_resets WHERE id = ?", [resetRecord.id]);

    return res.json({ message: "Contraseña restablecida con éxito." });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
};

/**
 * VERIFICAR CONTRASEÑA
 * POST /api/auth/validate-password
 */
export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "La contraseña es obligatoria." });
    }
    const userId = req.user.user_id;
    const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    const userRecord = rows[0];
    const match = await bcrypt.compare(password, userRecord.password);
    if (match) {
      return res.json({ valid: true });
    } else {
      return res.status(401).json({ valid: false, message: "Contraseña incorrecta." });
    }
  } catch (error) {
    console.error("Error en verifyPassword:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
};
