const express = require('express');
const router = express.Router();
const {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  deleteVenta,
} = require('../controllers/ventaController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, authorizePerm('ventas', 'ver'), getVentas)
  .post(protect, authorizePerm('ventas', 'crear'), createVenta);

router.route('/:id')
  .get(protect, authorizePerm('ventas', 'ver'), getVentaById)
  .put(protect, authorizePerm('ventas', 'editar'), updateVenta)
  .delete(protect, authorizePerm('ventas', 'eliminar'), deleteVenta);

module.exports = router;
