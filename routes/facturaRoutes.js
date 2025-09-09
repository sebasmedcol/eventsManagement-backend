const express = require('express');
const router = express.Router();
const {
  getFacturas,
  getFacturaById,
  createFactura,
  updateFactura,
  deleteFactura,
} = require('../controllers/facturaController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, getFacturas)
  .post(protect, createFactura);

router.route('/:id')
  .get(protect, getFacturaById)
  .put(protect, updateFactura)
  .delete(protect, deleteFactura);

module.exports = router;