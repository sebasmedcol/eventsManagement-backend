const express = require('express');
const router = express.Router();
const {
  register,
  loginUsuario,
  getMe,
  checkEmpresaNombre,
  checkNombreUsuario,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/disponibilidad/empresa', checkEmpresaNombre);
router.get('/disponibilidad/usuario', checkNombreUsuario);
router.post('/register', register);
router.post('/login', loginUsuario);
router.get('/me', protect, getMe);

module.exports = router;
