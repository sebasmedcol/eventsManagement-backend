const express = require('express');
const router = express.Router();
const {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
} = require('../controllers/productoController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

// Rutas protegidas con verificación de plan
router.route('/')
  .get(protect, authorizePerm('productos', 'ver'), checkModuleAccess('productos'), getProductos)
  .post(protect, authorizePerm('productos', 'crear'), checkModuleAccess('productos'), checkLimitMiddleware('producto'), createProducto);

router.route('/:id')
  .get(protect, authorizePerm('productos', 'ver'), checkModuleAccess('productos'), getProductoById)
  .put(protect, authorizePerm('productos', 'editar'), checkModuleAccess('productos'), updateProducto)
  .delete(protect, authorizePerm('productos', 'eliminar'), checkModuleAccess('productos'), deleteProducto);

module.exports = router;
