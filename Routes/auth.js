const express = require("express");
const router = express.Router();
const { verifyToken } = require("../Middlewares/authMiddleware");
const authController = require("../Controllers/authController");

// POST: Registrar un nuevo usuario
router.post("/signup", authController.registerUser);

// POST: Iniciar sesión de usuario
router.post("/login", authController.loginUser);

// POST: Enviar correo para restablecer contraseña
router.post("/forgot-password", authController.forgotPassword);

// POST: Restablecer la contraseña
router.post("/reset-password", authController.resetPassword);

// POST: Validar contraseña del usuario (requiere token)
router.post("/validate-password", verifyToken, authController.verifyPassword);

module.exports = router;
