import db from '../Config/db';

// **Iniciar un programa**
export const startProgram = async (req, res) => {
    const { duration, mode } = req.body;

    if (!duration || !mode) {
        return res.status(400).json({ message: "Duración y modo son obligatorios." });
    }

    try {
        const query = 'INSERT INTO programs (duration, mode, active) VALUES (?, ?, ?)';
        const [result] = await db.query(query, [duration, mode, 1]); // Se inicia activo por defecto
        res.status(201).json({ 
            message: '✅ Programa iniciado exitosamente.', 
            program_id: result.insertId 
        });
    } catch (error) {
        console.error("❌ [Error] al iniciar programa:", error);
        res.status(500).json({ message: "Error al iniciar el programa." });
    }
};

// **Obtener programas activos**
export const getActivePrograms = async (req, res) => {
    try {
        const query = 'SELECT * FROM programs WHERE active = 1';
        const [programs] = await db.query(query);
        res.status(200).json(programs.length > 0 ? programs : []);
    } catch (error) {
        console.error("❌ [Error] al obtener programas activos:", error);
        res.status(500).json({ message: "Error al obtener los programas activos." });
    }
};
