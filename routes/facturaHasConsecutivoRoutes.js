const express = require('express');
const router = express.Router();
const {
  getFacturaHasConsecutivos,
  getFacturaHasConsecutivoById,
  createFacturaHasConsecutivo,
  updateFacturaHasConsecutivo,
  deleteFacturaHasConsecutivo,
} = require('../controllers/facturaHasConsecutivoController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, getFacturaHasConsecutivos)
  .post(protect, createFacturaHasConsecutivo);

router.route('/:id')
  .get(protect, getFacturaHasConsecutivoById)
  .put(protect, updateFacturaHasConsecutivo)
  .delete(protect, deleteFacturaHasConsecutivo);

module.exports = router;