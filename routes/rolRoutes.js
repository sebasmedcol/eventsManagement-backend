const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol,
} = require('../controllers/rolController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkModuleAccess } = require('../middlewares/planMiddleware');

router.use(protect);

// authorizeRoles fue reemplazado por authorizePerm para que usuarios con rol_id
// que tengan permisos sobre el módulo 'roles' puedan acceder, sin importar
// si su campo rol es 'admin' o cualquier otro.
router
  .route('/')
  .get(authorizePerm('roles', 'ver'), checkModuleAccess('roles'), getRoles)
  .post(authorizePerm('roles', 'crear'), checkModuleAccess('roles'), createRol);

router
  .route('/:id')
  .get(authorizePerm('roles', 'ver'), checkModuleAccess('roles'), getRolById)
  .put(authorizePerm('roles', 'editar'), checkModuleAccess('roles'), updateRol)
  .delete(authorizePerm('roles', 'eliminar'), checkModuleAccess('roles'), deleteRol);

module.exports = router;