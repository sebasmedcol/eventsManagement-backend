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

router.use(protect);

router
  .route('/')
  .get(authorizePerm('cotizaciones', 'ver'), getCotizaciones)
  .post(authorizePerm('cotizaciones', 'crear'), createCotizacion);

router
  .route('/:id')
  .get(authorizePerm('cotizaciones', 'ver'), getCotizacionById)
  .put(authorizePerm('cotizaciones', 'editar'), updateCotizacion)
  .delete(authorizePerm('cotizaciones', 'eliminar'), deleteCotizacion);

router.post(
  '/:id/convertir-a-venta',
  authorizePerm('cotizaciones', 'editar'),
  authorizePerm('ventas', 'crear'),
  convertirCotizacionAVenta
);

module.exports = router;
