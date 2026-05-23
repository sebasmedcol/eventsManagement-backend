const express = require('express');
const router = express.Router();
const {
  getConsecutivos,
  getConsecutivoById,
  createConsecutivo,
  updateConsecutivo,
  deleteConsecutivo,
} = require('../controllers/consecutivoController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkModuleAccess } = require('../middlewares/planMiddleware');

// Rutas protegidas con verificación de plan (consecutivos usa módulo 'facturacion')
router.route('/')
  .get(protect, authorizePerm('consecutivos', 'ver'), checkModuleAccess('facturacion'), getConsecutivos)
  .post(protect, authorizePerm('consecutivos', 'crear'), checkModuleAccess('facturacion'), createConsecutivo);

router.route('/:id')
  .get(protect, authorizePerm('consecutivos', 'ver'), checkModuleAccess('facturacion'), getConsecutivoById)
  .put(protect, authorizePerm('consecutivos', 'editar'), checkModuleAccess('facturacion'), updateConsecutivo)
  .delete(protect, authorizePerm('consecutivos', 'eliminar'), checkModuleAccess('facturacion'), deleteConsecutivo);

module.exports = router;
