const express = require('express');
const router = express.Router();
const { loginUsuario, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Ruta para login
router.post('/login', loginUsuario);

// Ruta para obtener datos del usuario actual (protegida)
router.get('/me', protect, getMe);

module.exports = router;