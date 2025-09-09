const express = require('express');
const router = express.Router();
const {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
} = require('../controllers/productoController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, getProductos)
  .post(protect, createProducto);

router.route('/:id')
  .get(protect, getProductoById)
  .put(protect, updateProducto)
  .delete(protect, deleteProducto);

module.exports = router;