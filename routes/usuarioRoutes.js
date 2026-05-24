const express = require('express');
const router = express.Router();
const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} = require('../controllers/usuarioController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

router.use(protect);

// authorizeRoles fue reemplazado por authorizePerm para que usuarios con rol_id
// que tengan permisos sobre el módulo 'usuarios' puedan acceder.
router
  .route('/')
  .get(authorizePerm('usuarios', 'ver'), checkModuleAccess('usuarios'), getUsuarios)
  .post(authorizePerm('usuarios', 'crear'), checkModuleAccess('usuarios'), checkLimitMiddleware('usuario'), createUsuario);

router
  .route('/:id')
  .get(authorizePerm('usuarios', 'ver'), checkModuleAccess('usuarios'), getUsuarioById)
  .put(authorizePerm('usuarios', 'editar'), checkModuleAccess('usuarios'), updateUsuario)
  .delete(authorizePerm('usuarios', 'eliminar'), checkModuleAccess('usuarios'), deleteUsuario);

module.exports = router;