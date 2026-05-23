const express = require('express');
const router = express.Router();
const {
  getFacturas,
  getFacturaById,
  createFactura,
  updateFactura,
  deleteFactura,
} = require('../controllers/facturaController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

// Rutas protegidas con verificación de plan
router.route('/')
  .get(protect, authorizePerm('facturas', 'ver'), checkModuleAccess('facturacion'), getFacturas)
  .post(protect, authorizePerm('facturas', 'crear'), checkModuleAccess('facturacion'), checkLimitMiddleware('factura'), createFactura);

router.route('/:id')
  .get(protect, authorizePerm('facturas', 'ver'), checkModuleAccess('facturacion'), getFacturaById)
  .put(protect, authorizePerm('facturas', 'editar'), checkModuleAccess('facturacion'), updateFactura)
  .delete(protect, authorizePerm('facturas', 'eliminar'), checkModuleAccess('facturacion'), deleteFactura);

module.exports = router;
