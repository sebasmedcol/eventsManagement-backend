const express = require('express');
const router = express.Router();
const {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  deleteVenta,
  anularVenta,
  actualizarVencidas,
} = require('../controllers/ventaController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, authorizePerm('ventas', 'ver'), getVentas)
  .post(protect, authorizePerm('ventas', 'crear'), createVenta);

router.route('/actualizar-vencidas')
  .put(protect, authorizePerm('ventas', 'ver'), actualizarVencidas);

router.route('/:id/anular')
  .put(protect, authorizePerm('ventas', 'editar'), anularVenta);

router.route('/:id')
  .get(protect, authorizePerm('ventas', 'ver'), getVentaById)
  .put(protect, authorizePerm('ventas', 'editar'), updateVenta)
  .delete(protect, authorizePerm('ventas', 'eliminar'), deleteVenta);

module.exports = router;