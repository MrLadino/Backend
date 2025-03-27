const express = require("express");
const router = express.Router();
const productosController = require("../Controllers/productosController");
const { verifyToken, verifyAdmin } = require("../Middlewares/authMiddleware");

// Rutas para CATEGORÍAS
router.get("/categorias", verifyToken, productosController.getCategorias);
router.post("/categorias", verifyToken, productosController.createCategoria);
router.put("/categorias/:id", verifyToken, productosController.updateCategoria);
router.delete("/categorias/:id", verifyToken, productosController.deleteCategoria);

// Rutas para manejo de archivos Excel
router.get("/export-excel", verifyToken, productosController.exportExcel);

// Evitar que GET /import-excel caiga en rutas dinámicas
router.get("/import-excel", verifyToken, (req, res) => {
  return res.status(405).json({
    message: "Método GET no permitido. Usa POST con FormData para importar Excel."
  });
});
// Ruta POST real para importar Excel
router.post("/import-excel", verifyToken, productosController.importExcel);

/*
  Rutas especiales para "caja" (actualizar stock y búsqueda por código)
  Se definen antes de las rutas dinámicas para evitar conflictos.
*/
router.get("/buscar/:codigo", verifyToken, productosController.getProductoByCodigo);
router.put("/actualizar-stock", verifyToken, productosController.actualizarStock);

/*
  Rutas dinámicas para CRUD de productos (colocadas al final para evitar colisiones)
*/
router.get("/", verifyToken, productosController.getProductos);
router.get("/:id", verifyToken, productosController.getProductoById);
router.post("/", verifyToken, productosController.createProducto);
router.put("/:id", verifyToken, productosController.updateProducto);
router.delete("/:id", verifyToken, productosController.deleteProducto);

module.exports = router;
