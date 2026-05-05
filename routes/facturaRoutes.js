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

// Rutas protegidas
router.route('/')
  .get(protect, authorizePerm('facturas', 'ver'), getFacturas)
  .post(protect, authorizePerm('facturas', 'crear'), createFactura);

router.route('/:id')
  .get(protect, authorizePerm('facturas', 'ver'), getFacturaById)
  .put(protect, authorizePerm('facturas', 'editar'), updateFactura)
  .delete(protect, authorizePerm('facturas', 'eliminar'), deleteFactura);

module.exports = router;
