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

// Rutas protegidas
router.route('/')
  .get(protect, authorizePerm('consecutivos', 'ver'), getConsecutivos)
  .post(protect, authorizePerm('consecutivos', 'crear'), createConsecutivo);

router.route('/:id')
  .get(protect, authorizePerm('consecutivos', 'ver'), getConsecutivoById)
  .put(protect, authorizePerm('consecutivos', 'editar'), updateConsecutivo)
  .delete(protect, authorizePerm('consecutivos', 'eliminar'), deleteConsecutivo);

module.exports = router;
