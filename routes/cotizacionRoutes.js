const express = require('express');
const router = express.Router();
const {
  getCotizaciones,
  getCotizacionById,
  createCotizacion,
  updateCotizacion,
  deleteCotizacion,
  convertirCotizacionAVenta,
} = require('../controllers/cotizacionController');
const { protect, authorizePerm } = require('../middlewares/authMiddleware');
const { checkLimitMiddleware, checkModuleAccess } = require('../middlewares/planMiddleware');

router.use(protect);

router
  .route('/')
  .get(authorizePerm('cotizaciones', 'ver'), checkModuleAccess('cotizaciones'), getCotizaciones)
  .post(authorizePerm('cotizaciones', 'crear'), checkModuleAccess('cotizaciones'), checkLimitMiddleware('cotizacion'), createCotizacion);

router
  .route('/:id')
  .get(authorizePerm('cotizaciones', 'ver'), checkModuleAccess('cotizaciones'), getCotizacionById)
  .put(authorizePerm('cotizaciones', 'editar'), checkModuleAccess('cotizaciones'), updateCotizacion)
  .delete(authorizePerm('cotizaciones', 'eliminar'), checkModuleAccess('cotizaciones'), deleteCotizacion);

router.post(
  '/:id/convertir-a-venta',
  authorizePerm('cotizaciones', 'editar'),
  authorizePerm('ventas', 'crear'),
  checkModuleAccess('cotizaciones'),
  checkModuleAccess('ventas'),
  checkLimitMiddleware('venta'),
  convertirCotizacionAVenta
);

module.exports = router;
