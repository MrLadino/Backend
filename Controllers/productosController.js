const db = require("../Config/db");
const ExcelJS = require("exceljs");
const multer = require("multer");

/* =================== AYUDA A OCULTAR TOKENS EN LOGS (ejemplo) =================== */
// Si en algún punto quisieras loguear el token, en lugar de console.log(token),
// harías: console.log(token ? token.slice(0, 5) + "...(hidden)" : "No token");

/* Generar un ID corto (5 dígitos) */
function generarIdCorto() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

// =================== CATEGORÍAS ===================

exports.getCategorias = async (req, res) => {
  try {
    // Si el usuario autenticado no es admin, se muestran las categorías del admin (user_id = 30)
    const targetUserId = req.user.role !== "admin" ? 30 : req.user.user_id;
    const [categorias] = await db.query(
      "SELECT * FROM product_categories WHERE user_id = ?",
      [targetUserId]
    );
    return res.json(categorias);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener categorías", error });
  }
};

exports.createCategoria = async (req, res) => {
  const userId = req.user.user_id;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "El nombre es obligatorio." });
  }
  try {
    const [result] = await db.query(
      "INSERT INTO product_categories (name, user_id) VALUES (?, ?)",
      [name, userId]
    );
    return res.json({ message: "Categoría creada con éxito.", id: result.insertId, name });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear categoría", error });
  }
};

exports.updateCategoria = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "El nombre es obligatorio." });
  }
  try {
    const [result] = await db.query(
      "UPDATE product_categories SET name = ? WHERE category_id = ? AND user_id = ?",
      [name, id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoría no encontrada." });
    }
    return res.json({ message: "Categoría actualizada con éxito." });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar categoría", error });
  }
};

exports.deleteCategoria = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  try {
    const [productos] = await db.query(
      "SELECT id FROM productos WHERE categoria_id = ? AND user_id = ?",
      [id, userId]
    );
    if (productos.length > 0) {
      return res.status(400).json({ message: "No se puede eliminar la categoría porque tiene productos asociados." });
    }
    await db.query("DELETE FROM product_categories WHERE category_id = ? AND user_id = ?", [id, userId]);
    return res.json({ message: "Categoría eliminada con éxito." });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar categoría", error });
  }
};

// =================== PRODUCTOS ===================
exports.createProducto = async (req, res) => {
  let { sku, nombre, descripcion, imagen, precio, stock, categoria, activo, codigo_barras } = req.body;
  try {
    const userId = req.user.user_id;
    const id = generarIdCorto();

    if (!categoria) {
      return res.status(400).json({ message: "No hay categoría para este producto" });
    }

    const [catResult] = await db.query(
      "SELECT category_id FROM product_categories WHERE name = ? AND user_id = ?",
      [categoria, userId]
    );
    if (catResult.length === 0) {
      return res.status(400).json({ message: "La categoría no existe. Crea la categoría primero." });
    }
    const categoria_id = catResult[0].category_id;
    precio = precio ? Number(precio) : 0;

    await db.query(
      `INSERT INTO productos (id, user_id, sku, nombre, descripcion, imagen, precio, stock, categoria_id, activo, codigo_barras)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, sku || "", nombre || "", descripcion || "", imagen || null, precio, stock || 0, categoria_id, activo ?? 1, codigo_barras || ""]
    );

    return res.json({ message: "Producto creado con éxito." });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear producto", error });
  }
};

exports.getProductos = async (req, res) => {
  try {
    // Si el usuario autenticado no es admin, se obtienen los productos del admin (user_id = 30)
    const targetUserId = req.user.role !== "admin" ? 30 : req.user.user_id;
    const [productos] = await db.query("SELECT * FROM productos WHERE user_id = ?", [targetUserId]);
    return res.json(productos);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener productos", error });
  }
};

exports.getProductoById = async (req, res) => {
  const { id } = req.params;
  // Si el usuario autenticado no es admin, se busca el producto en los del admin (user_id = 30)
  const targetUserId = req.user.role !== "admin" ? 30 : req.user.user_id;
  try {
    const [[producto]] = await db.query("SELECT * FROM productos WHERE id = ? AND user_id = ?", [id, targetUserId]);
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    return res.json(producto);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener producto", error });
  }
};

exports.updateProducto = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;
  const { sku, nombre, descripcion, imagen, precio, stock, categoria, activo, codigo_barras } = req.body;
  try {
    let categoria_id = null;
    if (categoria) {
      const [catResult] = await db.query("SELECT category_id FROM product_categories WHERE name = ? AND user_id = ?", [categoria, userId]);
      if (catResult.length === 0) {
        return res.status(400).json({ message: "La categoría no existe." });
      }
      categoria_id = catResult[0].category_id;
    }
    const precioNum = precio ? Number(precio) : 0;

    const [result] = await db.query(
      `UPDATE productos 
       SET sku = COALESCE(?, sku),
           nombre = COALESCE(?, nombre),
           descripcion = COALESCE(?, descripcion),
           imagen = COALESCE(?, imagen),
           precio = COALESCE(?, precio),
           stock = COALESCE(?, stock),
           categoria_id = COALESCE(?, categoria_id),
           activo = COALESCE(?, activo),
           codigo_barras = COALESCE(?, codigo_barras)
       WHERE id = ? AND user_id = ?`,
      [sku, nombre, descripcion, imagen, precioNum, stock, categoria_id, activo, codigo_barras, id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado o no modificado." });
    }
    return res.json({ message: "Producto actualizado correctamente." });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar producto", error });
  }
};

exports.deleteProducto = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;
  try {
    const [result] = await db.query("DELETE FROM productos WHERE id = ? AND user_id = ?", [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }
    return res.json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar producto", error });
  }
};

// =================== EXPORTAR EXCEL ===================
exports.exportExcel = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [productos] = await db.query(
      `SELECT p.sku, p.nombre, p.descripcion, p.imagen, p.precio, p.activo, p.codigo_barras, pc.name AS categoria
       FROM productos p
       LEFT JOIN product_categories pc ON p.categoria_id = pc.category_id
       WHERE p.user_id = ?`,
      [userId]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Productos");
    
    worksheet.columns = [
      { header: "SKU", key: "sku", width: 12 },
      { header: "Nombre", key: "nombre", width: 25 },
      { header: "Descripción", key: "descripcion", width: 30 },
      { header: "Imagen", key: "imagen", width: 20 },
      { header: "Precio", key: "precio", width: 10 },
      { header: "Activo", key: "activo", width: 8 },
      { header: "Código de Barras", key: "codigo_barras", width: 20 },
      { header: "Categoría", key: "categoria", width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };

    productos.forEach((p) => {
      worksheet.addRow({
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion,
        imagen: p.imagen ? "✔" : "✘",
        precio: p.precio,
        activo: p.activo ? "Sí" : "No",
        codigo_barras: p.codigo_barras || "",
        categoria: p.categoria || "",
      });
    });

    res.setHeader("Content-Disposition", 'attachment; filename="productos.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ message: "Error al exportar Excel", error });
  }
};

// =================== IMPORTAR EXCEL ===================
exports.importExcel = (req, res) => {
  const uploadExcel = multer({ storage: multer.memoryStorage() }).single("excel");
  uploadExcel(req, res, async (err) => {
    if (err) {
      console.error("Error al subir el archivo Excel:", err);
      return res.status(400).json({ message: "Error al subir archivo Excel", error: err });
    }
    try {
      const userId = req.user.user_id;
      if (!req.file) {
        return res.status(400).json({ message: "No se recibió ningún archivo Excel" });
      }

      const categoryName = req.body.categoryName;
      if (!categoryName) {
        return res.status(400).json({ message: "El nombre de la categoría es requerido." });
      }

      const [catResult] = await db.query(
        "SELECT category_id FROM product_categories WHERE name = ? AND user_id = ?",
        [categoryName, userId]
      );
      if (catResult.length === 0) {
        return res.status(400).json({ message: "La categoría especificada no existe." });
      }
      const category_id = catResult[0].category_id;

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];

      const rows = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) {
          console.log("Encabezado:", row.values);
          return;
        }
        console.log(`Fila ${rowNumber}:`, row.values);
        // Se espera el orden: [2] = SKU, [3] = Nombre, [4] = Descripción, [5] = Codigo Qr, [6] = Stock, [7] = Precio
        const sku = row.values[2] ? String(row.values[2]).trim() : "";
        const nombre = row.values[3] ? String(row.values[3]).trim() : "";
        const descripcion = row.values[4] ? String(row.values[4]).trim() : "";
        const codigo_barras = row.values[5] ? String(row.values[5]).trim() : "";
        const stock = row.values[6] ? Number(row.values[6]) : 0;
        const precio = row.values[7] ? Number(row.values[7]) : 0;

        if (!nombre) {
          console.warn(`Fila ${rowNumber} omitida: nombre vacío`);
          return;
        }
        rows.push({ sku, nombre, descripcion, codigo_barras, stock, precio });
      });

      if (rows.length === 0) {
        return res.status(400).json({ message: "No se encontraron filas válidas en el archivo Excel." });
      }

      for (const data of rows) {
        const id = generarIdCorto();
        await db.query(
          "INSERT INTO productos (id, sku, nombre, descripcion, precio, stock, user_id, categoria_id, activo, codigo_barras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            data.sku,
            data.nombre,
            data.descripcion,
            data.precio,
            data.stock,
            userId,
            category_id,
            0,
            data.codigo_barras
          ]
        );
      }

      return res.json({ message: "Importación completada con éxito.", inserted: rows.length });
    } catch (error) {
      console.error("Error al importar Excel:", error);
      return res.status(500).json({ message: "Error al importar Excel", error });
    }
  });
};

// =================== CAJA ===================
// Este endpoint se utiliza para escanear el código de barras/QR y mostrar la información del producto.
// No permite realizar ventas desde este apartado.
exports.getProductoByCodigo = async (req, res) => {
  const { codigo } = req.params;
  // Si el usuario autenticado no es admin, se busca el producto en los del admin (user_id = 30)
  const targetUserId = req.user.role !== "admin" ? 30 : req.user.user_id;
  try {
    const [[producto]] = await db.query("SELECT * FROM productos WHERE codigo_barras = ? AND user_id = ?", [codigo, targetUserId]);
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }
    return res.json(producto);
  } catch (error) {
    return res.status(500).json({ message: "Error al buscar producto por código", error });
  }
};

/* =================== ACTUALIZAR STOCK CON 'cantidadVendida' =================== */
exports.actualizarStock = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id, cantidadVendida } = req.body;
    if (!id || !cantidadVendida) {
      return res.status(400).json({ message: "Faltan datos: id o cantidadVendida." });
    }

    // 1. Buscar el producto
    const [[producto]] = await db.query("SELECT * FROM productos WHERE id = ? AND user_id = ?", [id, userId]);
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // 2. Calcular nuevo stock
    const nuevoStock = producto.stock - Number(cantidadVendida);
    if (nuevoStock < 0) {
      return res.status(400).json({ message: "No hay stock suficiente." });
    }

    // 3. Actualizar en la base de datos
    const [result] = await db.query("UPDATE productos SET stock = ? WHERE id = ? AND user_id = ?", [nuevoStock, id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado o no actualizado." });
    }

    // 4. Responder con el nuevo stock
    return res.json({ message: "Stock actualizado correctamente.", nuevoStock });
  } catch (error) {
    console.error("Error al actualizar stock:", error);
    return res.status(500).json({ message: "Error al actualizar stock", error });
  }
};
