// program.js
const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// Iniciar un programa
router.post('/start', async (req, res) => {
  const { duration, mode } = req.body;
  if (!duration || !mode) {
    return res.status(400).json({ message: "Duración y modo son obligatorios." });
  }
  try {
    const query = 'INSERT INTO programs (duration, mode, active) VALUES (?, ?, ?)';
    // Se inicia el programa activo por defecto (active = 1)
    const [result] = await db.query(query, [duration, mode, 1]);
    return res.status(201).json({ message: 'Programa iniciado exitosamente', id: result.insertId });
  } catch (err) {
    console.error("Error al iniciar programa:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Obtener programas activos
router.get('/active', async (req, res) => {
  try {
    const query = 'SELECT * FROM programs WHERE active = 1';
    const [results] = await db.query(query);
    return res.status(200).json(results);
  } catch (err) {
    console.error("Error al obtener programas activos:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
