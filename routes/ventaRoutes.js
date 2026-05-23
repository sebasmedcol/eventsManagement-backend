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
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

// Rutas protegidas con verificación de plan
router.route('/')
  .get(protect, authorizePerm('ventas', 'ver'), checkModuleAccess('ventas'), getVentas)
  .post(protect, authorizePerm('ventas', 'crear'), checkModuleAccess('ventas'), checkLimitMiddleware('venta'), createVenta);

router.route('/actualizar-vencidas')
  .put(protect, authorizePerm('ventas', 'ver'), checkModuleAccess('ventas'), actualizarVencidas);

router.route('/:id/anular')
  .put(protect, authorizePerm('ventas', 'editar'), checkModuleAccess('ventas'), anularVenta);

router.route('/:id')
  .get(protect, authorizePerm('ventas', 'ver'), checkModuleAccess('ventas'), getVentaById)
  .put(protect, authorizePerm('ventas', 'editar'), checkModuleAccess('ventas'), updateVenta)
  .delete(protect, authorizePerm('ventas', 'eliminar'), checkModuleAccess('ventas'), deleteVenta);

module.exports = router;
