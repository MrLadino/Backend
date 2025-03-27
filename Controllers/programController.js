import db from "../Config/db";

// Iniciar un programa
export const startProgram = async (req, res) => {
  const { duration, mode } = req.body;

  if (!duration || !mode) {
    return res.status(400).json({ message: "Duración y modo son obligatorios." });
  }

  try {
    const query = "INSERT INTO programs (duration, mode, active) VALUES (?, ?, ?)";
    const [result] = await db.query(query, [duration, mode, 1]); // Se inicia activo por defecto
    return res.status(201).json({
      message: "✅ Programa iniciado exitosamente.",
      program_id: result.insertId,
    });
  } catch (error) {
    console.error("❌ [Error] al iniciar programa:", error);
    return res.status(500).json({ message: "Error al iniciar el programa." });
  }
};

// Obtener programas activos
export const getActivePrograms = async (req, res) => {
  try {
    const query = "SELECT * FROM programs WHERE active = 1";
    const [programs] = await db.query(query);
    return res.status(200).json(programs || []);
  } catch (error) {
    console.error("❌ [Error] al obtener programas activos:", error);
    return res.status(500).json({ message: "Error al obtener los programas activos." });
  }
};
