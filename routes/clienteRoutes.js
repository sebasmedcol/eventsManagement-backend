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
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

// Rutas protegidas con verificación de plan
router.route('/')
  .get(protect, authorizePerm('clientes', 'ver'), checkModuleAccess('clientes'), getClientes)
  .post(protect, authorizePerm('clientes', 'crear'), checkModuleAccess('clientes'), checkLimitMiddleware('cliente'), createCliente);

router.route('/:id')
  .get(protect, authorizePerm('clientes', 'ver'), checkModuleAccess('clientes'), getClienteById)
  .put(protect, authorizePerm('clientes', 'editar'), checkModuleAccess('clientes'), updateCliente)
  .delete(protect, authorizePerm('clientes', 'eliminar'), checkModuleAccess('clientes'), deleteCliente);

module.exports = router;
