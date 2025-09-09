const express = require('express');
const router = express.Router();
const { getEventos, getEventoById } = require('../controllers/eventoController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.get('/', protect, getEventos);
router.get('/:id', protect, getEventoById);

module.exports = router;