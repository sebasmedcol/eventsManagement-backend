const express = require('express');
const router = express.Router();
const { getEventos, getEventoById } = require('../controllers/eventoController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkModuleAccess } = require('../middlewares/planMiddleware');

// Rutas protegidas con verificación de plan
router.get('/', protect, authorizePerm('eventos', 'ver'), checkModuleAccess('eventos'), getEventos);
router.get('/:id', protect, authorizePerm('eventos', 'ver'), checkModuleAccess('eventos'), getEventoById);

module.exports = router;
