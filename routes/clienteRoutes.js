const express = require('express');
const router = express.Router();
const {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} = require('../controllers/clienteController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, getClientes)
  .post(protect, createCliente);

router.route('/:id')
  .get(protect, getClienteById)
  .put(protect, updateCliente)
  .delete(protect, deleteCliente);

module.exports = router;