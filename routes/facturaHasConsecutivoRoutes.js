const express = require('express');
const router = express.Router();
const {
  getFacturaHasConsecutivos,
  getFacturaHasConsecutivoById,
  createFacturaHasConsecutivo,
  updateFacturaHasConsecutivo,
  deleteFacturaHasConsecutivo,
} = require('../controllers/facturaHasConsecutivoController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, authorizePerm('consecutivos', 'ver'), getFacturaHasConsecutivos)
  .post(protect, authorizePerm('consecutivos', 'editar'), createFacturaHasConsecutivo);

router.route('/:id')
  .get(protect, authorizePerm('consecutivos', 'ver'), getFacturaHasConsecutivoById)
  .put(protect, authorizePerm('consecutivos', 'editar'), updateFacturaHasConsecutivo)
  .delete(protect, authorizePerm('consecutivos', 'eliminar'), deleteFacturaHasConsecutivo);

module.exports = router;
