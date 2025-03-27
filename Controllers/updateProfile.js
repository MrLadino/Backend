// Controllers/updateProfile.js
const db = require("../Config/db");

export const updateProfile = async (req, res) => {
  const userId = req.user.user_id; // ID del usuario autenticado
  let { 
    name, 
    email,
    description, 
    phone, 
    profile_photo, 
    companyName, 
    companyDescription, 
    companyLocation, 
    companyPhone, 
    companyPhoto
  } = req.body;

  console.log("🔹 [BACKEND] Datos recibidos para actualizar:");
  console.log("👤 Usuario:", { userId, name, email, description, phone, profile_photo });
  console.log("🏢 Empresa:", { companyName, companyDescription, companyLocation, companyPhone, companyPhoto });

  if (!name || !phone) {
    return res.status(400).json({ message: "El nombre y el teléfono son obligatorios." });
  }

  // Convertir campos vacíos a NULL
  description = description || null;
  profile_photo = profile_photo || null;
  companyName = companyName || null;
  companyDescription = companyDescription || null;
  companyLocation = companyLocation || null;
  companyPhone = companyPhone || null;
  companyPhoto = companyPhoto || null;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Actualizar datos del usuario
    const updateUserQuery = `
      UPDATE users 
      SET name = ?, email = ?, description = ?, phone = ?, profile_photo = ?
      WHERE user_id = ?
    `;
    await connection.query(updateUserQuery, [
      name, email, description, phone, profile_photo, userId
    ]);
    console.log("✅ [Usuario] Datos actualizados correctamente.");

    // Verificar si ya existe una empresa para este usuario
    const [existingCompany] = await connection.query("SELECT * FROM companies WHERE user_id = ?", [userId]);
    if (existingCompany.length > 0) {
      // Actualizar empresa
      const updateCompanyQuery = `
        UPDATE companies 
        SET name = ?, description = ?, location = ?, phone = ?, photo = ?
        WHERE user_id = ?
      `;
      await connection.query(updateCompanyQuery, [
        companyName, companyDescription, companyLocation, companyPhone, companyPhoto, userId
      ]);
      console.log("✅ [Empresa] Datos actualizados correctamente.");
    } else {
      // Insertar nueva empresa
      const insertCompanyQuery = `
        INSERT INTO companies (user_id, name, description, location, phone, photo)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await connection.query(insertCompanyQuery, [
        userId, companyName, companyDescription, companyLocation, companyPhone, companyPhoto
      ]);
      console.log("✅ [Empresa] Creada correctamente.");
    }

    await connection.commit();
    res.status(200).json({ message: "Perfil y empresa actualizados exitosamente." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ [Error] updateProfile:", error);
    res.status(500).json({ message: "Hubo un error al actualizar el perfil." });
  } finally {
    if (connection) connection.release();
  }
};
