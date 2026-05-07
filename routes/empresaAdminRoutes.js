const express = require('express');
const router = express.Router();
const {
  getEmpresas,
  getEmpresaUsuarios,
  getUsuariosGlobal,
  aprobarEmpresa,
  rechazarEmpresa,
  bloquearEmpresa,
  desbloquearEmpresa,
  getEstadisticas,
} = require('../controllers/empresaAdminController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('superadmin'));

router.get('/', getEmpresas);
router.get('/usuarios', getUsuariosGlobal);
router.get('/:id/usuarios', getEmpresaUsuarios);
router.patch('/:id/aprobar', aprobarEmpresa);
router.patch('/:id/rechazar', rechazarEmpresa);
router.patch('/:id/bloquear', bloquearEmpresa);
router.patch('/:id/desbloquear', desbloquearEmpresa);
router.get('/stats/general', getEstadisticas);

module.exports = router;
