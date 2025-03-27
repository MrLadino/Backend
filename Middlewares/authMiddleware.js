const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const verifyToken = (req, res, next) => {
  try {
    let token = req.header("Authorization") || req.query.token;
    console.log("🔍 Token recibido en backend:", token ? token.slice(0, 5) + "...(hidden)" : "No token");

    if (!token) {
      return res.status(401).json({ message: "Acceso denegado, token requerido." });
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    console.log("🔍 Token después de limpiar 'Bearer':", token ? token.slice(0, 5) + "...(hidden)" : "No token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.user_id) {
      return res.status(401).json({ message: "Token inválido: Falta 'user_id' en el payload." });
    }

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email || "",
      role: decoded.role || "usuario",
    };

    console.log("✅ Usuario autenticado:", req.user);
    next();
  } catch (error) {
    console.error("❌ Error en la autenticación:", error.message);
    return res.status(403).json({ message: "Token inválido o expirado." });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Acceso denegado: Solo administradores pueden acceder a este recurso." });
  }
};

module.exports = { verifyToken, verifyAdmin };
