// Backend/scripts/generateExcelTemplate.js
const ExcelJS = require("exceljs");
const path = require("path");

async function generateTemplate() {
  // Crear un nuevo workbook y agregar una hoja llamada "Productos"
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Productos");

  // Definir las columnas necesarias para la importación de productos
  worksheet.columns = [
    { header: "SKU",         key: "sku",         width: 20 },
    { header: "Nombre",      key: "nombre",      width: 30 },
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Precio",      key: "precio",      width: 15 }
  ];

  // (Opcional) Agregar una fila de ejemplo (puedes eliminarla después)
  worksheet.addRow({
    sku: "PROD001",
    nombre: "Producto de ejemplo",
    descripcion: "Descripción del producto de ejemplo",
    precio: 100.00
  });

  // Estilizar la cabecera (negrita)
  worksheet.getRow(1).font = { bold: true };

  // Definir la ruta para guardar el archivo (en la misma carpeta scripts)
  const filePath = path.join(__dirname, "template_productos.xlsx");

  // Guardar el workbook en un archivo Excel
  await workbook.xlsx.writeFile(filePath);
  console.log("Template de Excel generado en:", filePath);
}

generateTemplate().catch((err) => {
  console.error("Error al generar el template de Excel:", err);
});
