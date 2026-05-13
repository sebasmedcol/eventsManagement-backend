const express = require('express');
const router = express.Router();

const {
  getEventosPremium,
  getEventoPremiumById,
  createEventoPremium,
  updateEventoPremium,
  deleteEventoPremium,
  getUsuariosEmpresaPremiumEventos,
  getNotificacionesEventosPremium,
  marcarNotificacionEventoPremiumLeida,
} = require('../controllers/eventoPremiumController');

const {
  getFichaById,
  getFichasByEvento,
  createFicha,
  updateFicha,
  deleteFicha,
  addProductoToFicha,
  updateProductoFicha,
  deleteProductoFicha,
  linkVentaToFicha,
} = require('../controllers/eventoFichaController');

const { protect, authorizePerm, requirePlan } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizePerm('eventos', 'ver'));
router.use(requirePlan(['premium', 'super']));

router.get('/notificaciones', getNotificacionesEventosPremium);
router.put('/notificaciones/:fichaId/leida', marcarNotificacionEventoPremiumLeida);
router.get('/usuarios', getUsuariosEmpresaPremiumEventos);

router
  .route('/')
  .get(getEventosPremium)
  .post(authorizePerm('eventos', 'crear'), createEventoPremium);

router
  .route('/:id')
  .get(getEventoPremiumById)
  .put(authorizePerm('eventos', 'editar'), updateEventoPremium)
  .delete(authorizePerm('eventos', 'eliminar'), deleteEventoPremium);

router
  .route('/:eventoId/fichas')
  .get(getFichasByEvento)
  .post(authorizePerm('eventos', 'editar'), createFicha);

router
  .route('/fichas/:fichaId')
  .get(authorizePerm('eventos', 'ver'), getFichaById)
  .put(authorizePerm('eventos', 'editar'), updateFicha)
  .delete(authorizePerm('eventos', 'editar'), deleteFicha);

router
  .route('/fichas/:fichaId/productos')
  .get(authorizePerm('eventos', 'ver'), getFichaById)
  .post(authorizePerm('eventos', 'editar'), addProductoToFicha);

router
  .route('/fichas/:fichaId/productos/:itemId')
  .put(authorizePerm('eventos', 'editar'), updateProductoFicha)
  .delete(authorizePerm('eventos', 'editar'), deleteProductoFicha);

router
  .route('/fichas/:fichaId/link-venta')
  .put(authorizePerm('ventas', 'crear'), authorizePerm('eventos', 'editar'), linkVentaToFicha);

module.exports = router;
