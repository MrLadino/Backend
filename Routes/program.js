// program.js
const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// Iniciar un programa
router.post('/start', (req, res) => {
    const { duration, mode } = req.body;
    const query = 'INSERT INTO programs (duration, mode) VALUES (?, ?)';
    db.query(query, [duration, mode], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Programa iniciado exitosamente', id: results.insertId });
    });
});

// Obtener programas activos
router.get('/active', (req, res) => {
    const query = 'SELECT * FROM programs WHERE active = 1';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

module.exports = router;
