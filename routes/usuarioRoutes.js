const express = require('express');
const router = express.Router();
const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} = require('../controllers/usuarioController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

router.use(protect);

router
  .route('/')
  .get(authorizeRoles('admin', 'superadmin'), checkModuleAccess('usuarios'), getUsuarios)
  .post(authorizeRoles('admin', 'superadmin'), checkModuleAccess('usuarios'), checkLimitMiddleware('usuario'), createUsuario);

router
  .route('/:id')
  .get(authorizeRoles('admin', 'superadmin'), checkModuleAccess('usuarios'), getUsuarioById)
  .put(authorizeRoles('admin', 'superadmin'), checkModuleAccess('usuarios'), updateUsuario)
  .delete(authorizeRoles('admin', 'superadmin'), checkModuleAccess('usuarios'), deleteUsuario);

module.exports = router;
