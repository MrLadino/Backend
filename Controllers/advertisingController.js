// Backend/Controllers/advertisingController.js
const db = require("../Config/db");
const fs = require("fs");
const path = require("path");

// GET /api/advertising
// Lista todas las categorías de publicidad con sus archivos.
// Si el usuario autenticado es admin, se muestran sus propias categorías; si no, se muestran las categorías de los administradores.
exports.getAdvertising = async (req, res) => {
  try {
    let categories;
    if (req.user.role === "admin") {
      // Si es admin, se muestran sus categorías
      const [cats] = await db.query(
        "SELECT * FROM advertising_categories WHERE user_id = ?",
        [req.user.user_id]
      );
      categories = cats;
    } else {
      // Si no es admin, se muestran las categorías de los administradores
      const [cats] = await db.query(
        `SELECT ac.*
         FROM advertising_categories ac
         JOIN users u ON ac.user_id = u.user_id
         WHERE u.role = 'admin'`
      );
      categories = cats;
    }

    const categoriesWithFiles = await Promise.all(
      categories.map(async (cat) => {
        const [files] = await db.query(
          "SELECT * FROM advertising_files WHERE category_id = ?",
          [cat.category_id]
        );
        return { ...cat, files };
      })
    );
    res.status(200).json(categoriesWithFiles);
  } catch (error) {
    console.error("Error al obtener publicidad:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// POST /api/advertising/category
// Crea una nueva categoría asignada al usuario autenticado
exports.createCategory = async (req, res) => {
  const userId = req.user.user_id;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "El nombre es obligatorio." });
  }
  try {
    const [result] = await db.query(
      "INSERT INTO advertising_categories (name, user_id) VALUES (?, ?)",
      [name, userId]
    );
    res.status(201).json({
      message: "Categoría creada",
      category_id: result.insertId,
      name,
    });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "Ya existe una categoría con ese nombre para tu usuario" });
    }
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// PUT /api/advertising/category/:id
// Actualiza el nombre de la categoría (si pertenece al usuario)
exports.updateCategory = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "El nuevo nombre es obligatorio." });
  }
  try {
    const [rows] = await db.query(
      "SELECT * FROM advertising_categories WHERE category_id = ? AND user_id = ?",
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada o no pertenece al usuario." });
    }
    await db.query(
      "UPDATE advertising_categories SET name = ? WHERE category_id = ? AND user_id = ?",
      [name, id, userId]
    );
    res.status(200).json({ message: "Categoría actualizada correctamente", category_id: id, name });
  } catch (error) {
    console.error("Error al editar categoría:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Ya existe una categoría con ese nombre para tu usuario" });
    }
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// DELETE /api/advertising/category/:id
// Elimina la categoría y, además, elimina todos los archivos asociados (tanto de la BD como físicos)
exports.deleteCategory = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM advertising_categories WHERE category_id = ? AND user_id = ?",
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada o no pertenece al usuario." });
    }
    // Obtener todos los archivos de la categoría
    const [files] = await db.query(
      "SELECT file_url FROM advertising_files WHERE category_id = ?",
      [id]
    );
    // Eliminar físicamente cada archivo de la carpeta uploads
    for (const file of files) {
      const fileName = path.basename(file.file_url);
      const fullPath = path.join(__dirname, "../uploads", fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    // Borrar los archivos de la BD
    await db.query("DELETE FROM advertising_files WHERE category_id = ?", [id]);
    // Borrar la categoría
    await db.query("DELETE FROM advertising_categories WHERE category_id = ? AND user_id = ?", [id, userId]);
    res.status(200).json({ message: "Categoría eliminada correctamente", category_id: id });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// POST /api/advertising/upload
// Sube múltiples archivos (imágenes/videos) y los asigna a una categoría
exports.uploadFiles = async (req, res) => {
  const { category_id } = req.body;
  if (!category_id) {
    return res.status(400).json({ message: "El id de la categoría es obligatorio." });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No se subió ningún archivo o los archivos no son válidos." });
  }
  try {
    const insertPromises = req.files.map((file) => {
      const fileUrl = `http://localhost:5000/uploads/${file.filename}`;
      const fileType = file.mimetype.startsWith("image") ? "image" : "video";
      return db.query(
        "INSERT INTO advertising_files (category_id, file_name, file_url, file_type) VALUES (?, ?, ?, ?)",
        [category_id, file.originalname, fileUrl, fileType]
      );
    });
    await Promise.all(insertPromises);
    res.status(201).json({ message: "Archivos subidos correctamente", total: req.files.length });
  } catch (error) {
    console.error("Error al subir archivos:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// DELETE /api/advertising/file/:file_id
// Elimina un archivo específico (imagen o video) de la BD y del disco
exports.deleteFile = async (req, res) => {
  const userId = req.user.user_id;
  const { file_id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT f.file_id, f.file_url, c.user_id
       FROM advertising_files f
       JOIN advertising_categories c ON f.category_id = c.category_id
       WHERE f.file_id = ?`,
      [file_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Archivo no encontrado o no pertenece al usuario." });
    }
    if (rows[0].user_id !== userId) {
      return res.status(403).json({ message: "No tienes permiso para eliminar este archivo." });
    }
    // Eliminar físicamente el archivo
    const fileName = path.basename(rows[0].file_url);
    const fullPath = path.join(__dirname, "../uploads", fileName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    // Eliminar de la BD
    await db.query("DELETE FROM advertising_files WHERE file_id = ?", [file_id]);
    res.status(200).json({ message: "Archivo eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar archivo:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};
