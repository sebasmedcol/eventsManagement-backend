const express = require('express');
const router = express.Router();
const { getEventos, getEventoById } = require('../controllers/eventoController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');

// Rutas protegidas
router.get('/', protect, authorizePerm('eventos', 'ver'), getEventos);
router.get('/:id', protect, authorizePerm('eventos', 'ver'), getEventoById);

module.exports = router;
