const express = require('express');
const router = express.Router();
const {
  getConsecutivos,
  getConsecutivoById,
  createConsecutivo,
  updateConsecutivo,
  deleteConsecutivo,
} = require('../controllers/consecutivoController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, getConsecutivos)
  .post(protect, createConsecutivo);

router.route('/:id')
  .get(protect, getConsecutivoById)
  .put(protect, updateConsecutivo)
  .delete(protect, deleteConsecutivo);

module.exports = router;