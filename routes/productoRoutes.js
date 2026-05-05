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

// Rutas protegidas
router.route('/')
  .get(protect, authorizePerm('productos', 'ver'), getProductos)
  .post(protect, authorizePerm('productos', 'crear'), createProducto);

router.route('/:id')
  .get(protect, authorizePerm('productos', 'ver'), getProductoById)
  .put(protect, authorizePerm('productos', 'editar'), updateProducto)
  .delete(protect, authorizePerm('productos', 'eliminar'), deleteProducto);

module.exports = router;
