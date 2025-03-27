// Backend/Routes/auth.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../Middlewares/authMiddleware");
const authController = require("../Controllers/authController");

// POST: Enviar correo para resetear contraseña
router.post("/forgot-password", authController.forgotPassword);

// POST: Resetear la contraseña
router.post("/reset-password", authController.resetPassword);

// POST: Validar contraseña del usuario (requiere token)
router.post("/validate-password", verifyToken, authController.verifyPassword);

module.exports = router;
