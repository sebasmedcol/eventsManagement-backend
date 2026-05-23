const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol,
} = require('../controllers/rolController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { checkModuleAccess } = require('../middlewares/planMiddleware');

router.use(protect);

// Rutas protegidas con verificación de plan (roles solo disponibles en plan pro o superior)
router
  .route('/')
  .get(authorizeRoles('admin', 'superadmin'), checkModuleAccess('roles'), getRoles)
  .post(authorizeRoles('admin', 'superadmin'), checkModuleAccess('roles'), createRol);

router
  .route('/:id')
  .get(authorizeRoles('admin', 'superadmin'), checkModuleAccess('roles'), getRolById)
  .put(authorizeRoles('admin', 'superadmin'), checkModuleAccess('roles'), updateRol)
  .delete(authorizeRoles('admin', 'superadmin'), checkModuleAccess('roles'), deleteRol);

module.exports = router;
