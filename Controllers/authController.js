const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../Config/db");
const dotenv = require("dotenv");
const { sendMail } = require("../utils/emailSender");
const crypto = require("crypto");

dotenv.config();
const { JWT_SECRET = "por_favor_cambia_este_secreto", ADMIN_CODE = "TicUser001" } = process.env;

/**
 * REGISTRAR UN NUEVO USUARIO
 * POST /api/auth/signup
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, adminPassword } = req.body;

    // Validar campos obligatorios
    if (!name || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }
    // Validar confirmación de contraseña
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }
    // Si el rol es admin, validar la contraseña de admin
    if (role === "admin") {
      if (!adminPassword || adminPassword.trim() !== ADMIN_CODE.trim()) {
        return res.status(400).json({ message: "Contraseña de Admin incorrecta." });
      }
    }
    // Verificar si el usuario ya existe
    const [existingUsers] = await db.query("SELECT email FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado." });
    }
    // Hashear la contraseña y, si corresponde, la de admin
    const hashedPassword = await bcrypt.hash(password, 10);
    let hashedAdminPassword = null;
    if (role === "admin") {
      hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    }
    // Insertar usuario en la base de datos
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, admin_password) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role, hashedAdminPassword]
    );
    const userId = result.insertId;
    const token = jwt.sign({ user_id: userId, email, role }, JWT_SECRET, { expiresIn: "24h" });
    return res.status(201).json({
      message: "Usuario registrado exitosamente.",
      token,
      user: { user_id: userId, name, email },
    });
  } catch (error) {
    console.error("Error en registerUser:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
};

/**
 * INICIAR SESIÓN
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { email, password, role, adminPassword } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: "Usuario no encontrado." });
    }
    const user = users[0];
    if (user.role !== role) {
      return res.status(403).json({ message: `Rol incorrecto. Tu cuenta está registrada como ${user.role}` });
    }
    if (role === "admin") {
      if (!adminPassword || adminPassword.trim() !== ADMIN_CODE.trim()) {
        return res.status(400).json({ message: "Contraseña de Admin incorrecta." });
      }
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta." });
    }
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    return res.status(200).json({
      message: "Login exitoso",
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Error en loginUser:", error);
    return res.status(500).json({ message: "Error en el servidor." });
  }
};

/**
 * OLVIDÉ MI CONTRASEÑA
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
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
    // Enlace de reseteo apuntando al frontend desplegado
    const resetLink = `https://mrladino.github.io/Frontend/reset-password?token=${token}`;
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
const resetPassword = async (req, res) => {
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
const verifyPassword = async (req, res) => {
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

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyPassword,
};
