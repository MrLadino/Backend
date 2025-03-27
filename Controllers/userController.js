const db = require('../Config/db');  // Conexión a la base de datos

// Obtener todos los usuarios
const getUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    return res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    // Se asume que la columna es "user_id"
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (rows.length > 0) {
      return res.status(200).json(rows[0]);
    } else {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (err) {
    console.error("Error al obtener el usuario:", err);
    return res.status(500).json({ message: 'Error al obtener el usuario' });
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
    return res.status(201).json({ message: 'Usuario creado con éxito', userId: result.insertId });
  } catch (err) {
    console.error("Error al crear el usuario:", err);
    return res.status(500).json({ message: 'Error al crear el usuario' });
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  const userId = req.user.user_id;  // Se utiliza "user_id" de forma consistente
  const { name, email, description, phone, companyInfo } = req.body;

  try {
    // Verificar si el usuario existe
    const [user] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar datos usando los valores nuevos o manteniendo los existentes
    const updatedName = name || user[0].name;
    const updatedEmail = email || user[0].email;
    const updatedDescription = description || user[0].description;
    const updatedPhone = phone || user[0].phone;
    const updatedCompanyInfo = companyInfo ? JSON.stringify(companyInfo) : user[0].companyInfo;

    const [result] = await db.query(
      `UPDATE users 
       SET name = ?, email = ?, description = ?, phone = ?, companyInfo = ?
       WHERE user_id = ?`,
      [updatedName, updatedEmail, updatedDescription, updatedPhone, updatedCompanyInfo, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'No se pudieron actualizar los datos' });
    }

    return res.json({ message: 'Datos actualizados con éxito' });
  } catch (error) {
    console.error("Error al actualizar los datos del perfil:", error);
    return res.status(500).json({ message: 'Error al actualizar los datos del perfil' });
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser };
