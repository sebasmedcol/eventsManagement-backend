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

router.use(protect);

router
  .route('/')
  .get(authorizeRoles('admin', 'superadmin'), getUsuarios)
  .post(authorizeRoles('admin', 'superadmin'), createUsuario);

router
  .route('/:id')
  .get(authorizeRoles('admin', 'superadmin'), getUsuarioById)
  .put(authorizeRoles('admin', 'superadmin'), updateUsuario)
  .delete(authorizeRoles('admin', 'superadmin'), deleteUsuario);

module.exports = router;
