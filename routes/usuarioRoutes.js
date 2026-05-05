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
  .get(authorizeRoles('admin'), getUsuarios)
  .post(authorizeRoles('admin'), createUsuario);

router
  .route('/:id')
  .get(authorizeRoles('admin'), getUsuarioById)
  .put(authorizeRoles('admin'), updateUsuario)
  .delete(authorizeRoles('admin'), deleteUsuario);

module.exports = router;

