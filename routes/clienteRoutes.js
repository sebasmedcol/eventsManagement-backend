const express = require('express');
const router = express.Router();
const {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} = require('../controllers/clienteController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.route('/')
  .get(protect, authorizePerm('clientes', 'ver'), getClientes)
  .post(protect, authorizePerm('clientes', 'crear'), createCliente);

router.route('/:id')
  .get(protect, authorizePerm('clientes', 'ver'), getClienteById)
  .put(protect, authorizePerm('clientes', 'editar'), updateCliente)
  .delete(protect, authorizePerm('clientes', 'eliminar'), deleteCliente);

module.exports = router;
