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

const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

router.use(protect);
// Acceso al módulo según plansConfig (free_trial, basico, pro, premium, super).
// checkModuleAccess lee plansConfig.js donde free_trial tiene eventosPremium: true.
router.use(checkModuleAccess('eventosPremium'));

router.get('/notificaciones', getNotificacionesEventosPremium);
router.put('/notificaciones/:fichaId/leida', marcarNotificacionEventoPremiumLeida);

router.use(authorizePerm('eventosPremium', 'ver'));

router.get('/usuarios', getUsuariosEmpresaPremiumEventos);

router
  .route('/')
  .get(getEventosPremium)
  .post(authorizePerm('eventosPremium', 'crear'), checkLimitMiddleware('evento'), createEventoPremium);

router
  .route('/:id')
  .get(getEventoPremiumById)
  .put(authorizePerm('eventosPremium', 'editar'), updateEventoPremium)
  .delete(authorizePerm('eventosPremium', 'eliminar'), deleteEventoPremium);

router
  .route('/:eventoId/fichas')
  .get(getFichasByEvento)
  .post(authorizePerm('eventosPremium', 'editar'), createFicha);

router
  .route('/fichas/:fichaId')
  .get(authorizePerm('eventosPremium', 'ver'), getFichaById)
  .put(authorizePerm('eventosPremium', 'editar'), updateFicha)
  .delete(authorizePerm('eventosPremium', 'editar'), deleteFicha);

router
  .route('/fichas/:fichaId/productos')
  .get(authorizePerm('eventosPremium', 'ver'), getFichaById)
  .post(authorizePerm('eventosPremium', 'editar'), addProductoToFicha);

router
  .route('/fichas/:fichaId/productos/:itemId')
  .put(authorizePerm('eventosPremium', 'editar'), updateProductoFicha)
  .delete(authorizePerm('eventosPremium', 'editar'), deleteProductoFicha);

router
  .route('/fichas/:fichaId/link-venta')
  .put(authorizePerm('ventas', 'crear'), authorizePerm('eventosPremium', 'editar'), checkLimitMiddleware('venta'), linkVentaToFicha);

module.exports = router;
