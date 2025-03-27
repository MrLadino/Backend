const db = require('../Config/db');  // Conexión a la base de datos

// Obtener todos los usuarios
const getUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM users');
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

// Obtener un usuario por ID
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
};

// Crear un nuevo usuario
const createUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
            [name, email, password]
        );
        res.status(201).json({ message: 'Usuario creado con éxito', userId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear el usuario' });
    }
};

// Actualizar usuario
const updateUser = async (req, res) => {
    const userId = req.user.id;  // ID del usuario autenticado
    const { name, email, description, phone, companyInfo } = req.body;

    try {
        // Verificar si el usuario existe
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (user.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Actualizar los datos del usuario
        const [result] = await db.query(
            `UPDATE users 
            SET name = ?, email = ?, description = ?, phone = ?, companyInfo = ? 
            WHERE id = ?`,
            [name || user[0].name, email || user[0].email, description || user[0].description, phone || user[0].phone, JSON.stringify(companyInfo) || user[0].companyInfo, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'No se pudieron actualizar los datos' });
        }

        res.json({ message: 'Datos actualizados con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar los datos del perfil' });
    }
};

module.exports = { getUsers, getUserById, createUser, updateUser };
