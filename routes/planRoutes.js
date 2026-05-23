/**
 * Rutas para información y gestión del plan de suscripción
 */

const express = require('express');
const router = express.Router();
const {
  getPlanInfo,
  getAllPlans,
  checkResourceLimitEndpoint,
  checkModuleAccessEndpoint,
  checkFeatureAccessEndpoint,
} = require('../controllers/planController');
const verifyToken = require('../middlewares/verifyToken');
const { attachPlanInfo } = require('../middlewares/planMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener información completa del plan actual
router.get('/plan-info', attachPlanInfo, getPlanInfo);

// Obtener todos los planes disponibles para comparación
router.get('/plans', getAllPlans);

// Verificar límite de un recurso específico
router.get('/check-limit/:resourceType', checkResourceLimitEndpoint);

// Verificar acceso a un módulo
router.get('/check-module/:moduleName', checkModuleAccessEndpoint);

// Verificar acceso a una característica
router.get('/check-feature/:featureName', checkFeatureAccessEndpoint);

module.exports = router;
