const express = require('express');
const router = express.Router();
const {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  deleteVenta,
} = require('../controllers/ventaController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, getVentas)
  .post(protect, createVenta);

router.route('/:id')
  .get(protect, getVentaById)
  .put(protect, updateVenta)
  .delete(protect, deleteVenta);

module.exports = router;