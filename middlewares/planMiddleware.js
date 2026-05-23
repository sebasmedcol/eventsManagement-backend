/**
 * Middleware para verificar límites y acceso según el plan de suscripción
 */

const {
  getPlanConfig,
  checkResourceLimit,
  isModuleAvailable,
  isFeatureAvailable,
  calculateTrialStatus,
  normalizePlanId,
  RESOURCE_TO_LIMIT_MAP,
  MODULE_NAMES,
  FEATURE_NAMES,
} = require('../config/plansConfig');

// Importar modelos necesarios para contar recursos
const Cliente = require('../models/clienteModel');
const Producto = require('../models/productoModel');
const Venta = require('../models/ventaModel');
const Cotizacion = require('../models/cotizacionModel');
const Usuario = require('../models/usuarioModel');
const Consecutivo = require('../models/consecutivoModel');
const Factura = require('../models/facturaModel');
const EventoPremium = require('../models/eventoPremiumModel');
const Empresa = require('../models/empresaModel');

/**
 * Mapeo de recursos a sus modelos y campos de empresa
 */
const RESOURCE_MODEL_MAP = {
  cliente: { model: Cliente, empresaField: 'empresa', estadoField: 'estado' },
  producto: { model: Producto, empresaField: 'empresa', estadoField: 'estado' },
  venta: { model: Venta, empresaField: 'empresa', estadoField: 'estado' },
  cotizacion: { model: Cotizacion, empresaField: 'empresa', estadoField: null },
  usuario: { model: Usuario, empresaField: 'empresa', estadoField: 'estado' },
  consecutivo: { model: Consecutivo, empresaField: 'empresa', estadoField: 'estado' },
  factura: { model: Factura, empresaField: 'empresa', estadoField: 'estado' },
  evento: { model: EventoPremium, empresaField: 'empresa', estadoField: 'estado' },
};

/**
 * Obtiene el conteo actual de un recurso para una empresa
 */
async function getResourceCount(resourceType, empresaId) {
  const config = RESOURCE_MODEL_MAP[resourceType];
  if (!config) {
    console.warn(`Tipo de recurso no configurado: ${resourceType}`);
    return 0;
  }
  
  try {
    const query = {
      [config.empresaField]: empresaId,
    };
    
    // Solo filtrar por estado si el modelo tiene ese campo
    if (config.estadoField) {
      query[config.estadoField] = { $ne: false };
    }
    
    const count = await config.model.countDocuments(query);
    return count;
  } catch (error) {
    console.error(`Error al contar ${resourceType}:`, error);
    return 0;
  }
}

/**
 * Obtiene el uso actual de todos los recursos para una empresa
 */
async function getAllResourceUsage(empresaId) {
  const usage = {};
  
  const countPromises = Object.keys(RESOURCE_MODEL_MAP).map(async (resourceType) => {
    const count = await getResourceCount(resourceType, empresaId);
    const limitKey = RESOURCE_TO_LIMIT_MAP[resourceType];
    if (limitKey) {
      usage[limitKey] = count;
    }
  });
  
  await Promise.all(countPromises);
  return usage;
}

/**
 * Middleware para verificar el estado del plan y trial
 * Adjunta información del plan al request
 */
const attachPlanInfo = async (req, res, next) => {
  try {
    // Obtener empresa del usuario autenticado
    const empresaId = req.user?.empresaId || req.user?.empresa;
    if (!empresaId) {
      return next(); // Si no hay empresa, continuar sin info de plan
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return next();
    }
    
    const planId = normalizePlanId(empresa.plan);
    const planConfig = getPlanConfig(planId);
    
    // Calcular estado del trial si aplica
    let trialStatus = null;
    if (planId === 'free_trial' && empresa.fechaCreacion) {
      trialStatus = calculateTrialStatus(
        empresa.fechaCreacion,
        planConfig.duracionDias || 14
      );
      
      // Si el trial expiró, marcar en la empresa
      if (trialStatus.expirado) {
        req.trialExpired = true;
      }
    }
    
    // Adjuntar información del plan al request
    req.planInfo = {
      planId,
      planConfig,
      empresaId,
      trialStatus,
    };
    
    next();
  } catch (error) {
    console.error('Error en attachPlanInfo middleware:', error);
    next(); // Continuar aunque falle
  }
};

/**
 * Middleware factory para verificar límite antes de crear un recurso
 * @param {string} resourceType - Tipo de recurso (cliente, producto, etc.)
 */
const checkLimitMiddleware = (resourceType) => {
  return async (req, res, next) => {
    try {
      const empresaId = req.user?.empresaId || req.user?.empresa;
      if (!empresaId) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado: empresa no identificada',
        });
      }
      
      // Obtener empresa y su plan
      const empresa = await Empresa.findById(empresaId);
      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: 'Empresa no encontrada',
        });
      }
      
      const planId = normalizePlanId(empresa.plan);
      const planConfig = getPlanConfig(planId);
      
      // Verificar si el trial expiró
      if (planId === 'free_trial') {
        const trialStatus = calculateTrialStatus(
          empresa.fechaCreacion,
          planConfig.duracionDias || 14
        );
        
        if (trialStatus.expirado) {
          return res.status(403).json({
            success: false,
            code: 'TRIAL_EXPIRED',
            message: 'Tu período de prueba ha expirado. Por favor, selecciona un plan para continuar usando NextEvents.',
            trialStatus,
          });
        }
      }
      
      // Obtener conteo actual del recurso
      const currentCount = await getResourceCount(resourceType, empresaId);
      
      // Verificar límite
      const limitCheck = checkResourceLimit(planId, resourceType, currentCount);
      
      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          code: 'LIMIT_REACHED',
          message: limitCheck.message,
          resourceType,
          limit: limitCheck.limit,
          current: limitCheck.current,
          planId,
          planName: planConfig.nombre,
        });
      }
      
      // Adjuntar información de límites al request para uso posterior
      req.limitInfo = {
        resourceType,
        ...limitCheck,
      };
      
      next();
    } catch (error) {
      console.error(`Error en checkLimitMiddleware (${resourceType}):`, error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar límites del plan',
      });
    }
  };
};

/**
 * Middleware factory para verificar acceso a un módulo
 * @param {string} moduleName - Nombre del módulo
 */
const checkModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      const empresaId = req.user?.empresaId || req.user?.empresa;
      if (!empresaId) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado: empresa no identificada',
        });
      }
      
      const empresa = await Empresa.findById(empresaId);
      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: 'Empresa no encontrada',
        });
      }
      
      const planId = normalizePlanId(empresa.plan);
      const planConfig = getPlanConfig(planId);
      
      // Verificar si el trial expiró
      if (planId === 'free_trial') {
        const trialStatus = calculateTrialStatus(
          empresa.fechaCreacion,
          planConfig.duracionDias || 14
        );
        
        if (trialStatus.expirado) {
          return res.status(403).json({
            success: false,
            code: 'TRIAL_EXPIRED',
            message: 'Tu período de prueba ha expirado. Por favor, selecciona un plan para continuar.',
          });
        }
      }
      
      // Verificar acceso al módulo
      if (!isModuleAvailable(planId, moduleName)) {
        const moduloNombre = MODULE_NAMES[moduleName] || moduleName;
        
        return res.status(403).json({
          success: false,
          code: 'MODULE_NOT_AVAILABLE',
          message: `El módulo "${moduloNombre}" no está disponible en tu plan ${planConfig.nombre}. Mejora tu plan para acceder a esta funcionalidad.`,
          moduleName,
          planId,
          planName: planConfig.nombre,
        });
      }
      
      next();
    } catch (error) {
      console.error(`Error en checkModuleAccess (${moduleName}):`, error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar acceso al módulo',
      });
    }
  };
};

/**
 * Middleware factory para verificar acceso a una característica
 * @param {string} featureName - Nombre de la característica
 */
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const empresaId = req.user?.empresaId || req.user?.empresa;
      if (!empresaId) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado: empresa no identificada',
        });
      }
      
      const empresa = await Empresa.findById(empresaId);
      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: 'Empresa no encontrada',
        });
      }
      
      const planId = normalizePlanId(empresa.plan);
      const planConfig = getPlanConfig(planId);
      
      if (!isFeatureAvailable(planId, featureName)) {
        const featureNombre = FEATURE_NAMES[featureName] || featureName;
        
        return res.status(403).json({
          success: false,
          code: 'FEATURE_NOT_AVAILABLE',
          message: `La función "${featureNombre}" no está disponible en tu plan ${planConfig.nombre}. Mejora tu plan para acceder.`,
          featureName,
          planId,
          planName: planConfig.nombre,
        });
      }
      
      next();
    } catch (error) {
      console.error(`Error en checkFeatureAccess (${featureName}):`, error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar acceso a la característica',
      });
    }
  };
};

module.exports = {
  attachPlanInfo,
  checkLimitMiddleware,
  checkModuleAccess,
  checkFeatureAccess,
  getResourceCount,
  getAllResourceUsage,
};
