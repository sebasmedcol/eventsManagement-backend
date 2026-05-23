/**
 * Controlador para información del plan de suscripción
 */

const {
  getPlanConfig,
  getAllLimitsWithUsage,
  calculateTrialStatus,
  getRecommendedUpgrade,
  normalizePlanId,
  isModuleAvailable,
  isFeatureAvailable,
  PLANS_CONFIG,
  MODULE_NAMES,
  FEATURE_NAMES,
} = require('../config/plansConfig');
const { getAllResourceUsage } = require('../middlewares/planMiddleware');
const Empresa = require('../models/empresaModel');

/**
 * GET /api/config/plan-info
 * Obtiene información completa del plan actual de la empresa
 */
const getPlanInfo = async (req, res) => {
  try {
    const empresaId = req.user?.empresa;
    
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
    
    // Obtener uso actual de recursos
    const usage = await getAllResourceUsage(empresaId);
    
    // Calcular límites con uso
    const limitsWithUsage = getAllLimitsWithUsage(planId, usage);
    
    // Calcular estado del trial si aplica
    let trialStatus = null;
    if (planId === 'free_trial' && empresa.fechaCreacion) {
      trialStatus = calculateTrialStatus(
        empresa.fechaCreacion,
        planConfig.duracionDias || 14
      );
    }
    
    // Obtener plan recomendado para upgrade
    const recommendedUpgrade = getRecommendedUpgrade(planId, usage);
    const recommendedPlan = recommendedUpgrade ? getPlanConfig(recommendedUpgrade) : null;
    
    // Construir respuesta completa
    const response = {
      success: true,
      data: {
        // Información del plan actual
        plan: {
          id: planId,
          nombre: planConfig.nombre,
          descripcion: planConfig.descripcion,
          precio: planConfig.precio || 0,
        },
        
        // Módulos disponibles con nombres legibles
        modulos: Object.entries(planConfig.modulos).reduce((acc, [key, value]) => {
          acc[key] = {
            disponible: value,
            nombre: MODULE_NAMES[key] || key,
          };
          return acc;
        }, {}),
        
        // Características disponibles con nombres legibles
        caracteristicas: Object.entries(planConfig.caracteristicas).reduce((acc, [key, value]) => {
          acc[key] = {
            disponible: value,
            nombre: FEATURE_NAMES[key] || key,
          };
          return acc;
        }, {}),
        
        // Límites y uso actual
        limites: limitsWithUsage,
        
        // Estado del trial (solo si aplica)
        trial: trialStatus,
        
        // Recomendación de upgrade (si aplica)
        upgrade: recommendedPlan ? {
          recomendado: true,
          planId: recommendedUpgrade,
          planNombre: recommendedPlan.nombre,
          precio: recommendedPlan.precio,
          razon: 'Estás cerca de alcanzar los límites de tu plan actual',
        } : null,
        
        // Fecha de información
        fechaConsulta: new Date().toISOString(),
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error al obtener información del plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del plan',
    });
  }
};

/**
 * GET /api/config/plans
 * Obtiene todos los planes disponibles para comparación
 */
const getAllPlans = async (req, res) => {
  try {
    const empresaId = req.user?.empresa;
    let currentPlanId = 'free_trial';
    
    if (empresaId) {
      const empresa = await Empresa.findById(empresaId);
      if (empresa) {
        currentPlanId = normalizePlanId(empresa.plan);
      }
    }
    
    // Transformar configuración de planes para el frontend
    const plans = Object.entries(PLANS_CONFIG).map(([id, config]) => ({
      id,
      nombre: config.nombre,
      descripcion: config.descripcion,
      precio: config.precio || 0,
      duracionDias: config.duracionDias,
      esPlanActual: id === currentPlanId,
      limites: config.limites,
      modulos: Object.entries(config.modulos).map(([key, value]) => ({
        id: key,
        nombre: MODULE_NAMES[key] || key,
        disponible: value,
      })),
      caracteristicas: Object.entries(config.caracteristicas).map(([key, value]) => ({
        id: key,
        nombre: FEATURE_NAMES[key] || key,
        disponible: value,
      })),
    }));
    
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener planes disponibles',
    });
  }
};

/**
 * GET /api/config/check-limit/:resourceType
 * Verifica si se puede crear un nuevo recurso de un tipo específico
 */
const checkResourceLimitEndpoint = async (req, res) => {
  try {
    const { resourceType } = req.params;
    const empresaId = req.user?.empresa;
    
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
    
    // Importar función de conteo
    const { getResourceCount } = require('../middlewares/planMiddleware');
    const { checkResourceLimit: checkLimit } = require('../config/plansConfig');
    
    const currentCount = await getResourceCount(resourceType, empresaId);
    const limitCheck = checkLimit(planId, resourceType, currentCount);
    
    res.json({
      success: true,
      data: {
        resourceType,
        planId,
        planNombre: planConfig.nombre,
        ...limitCheck,
      },
    });
  } catch (error) {
    console.error('Error al verificar límite:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar límite del recurso',
    });
  }
};

/**
 * GET /api/config/check-module/:moduleName
 * Verifica si un módulo está disponible
 */
const checkModuleAccessEndpoint = async (req, res) => {
  try {
    const { moduleName } = req.params;
    const empresaId = req.user?.empresa;
    
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
    const available = isModuleAvailable(planId, moduleName);
    
    res.json({
      success: true,
      data: {
        moduleName,
        moduleNombre: MODULE_NAMES[moduleName] || moduleName,
        disponible: available,
        planId,
        planNombre: planConfig.nombre,
        mensaje: available
          ? null
          : `El módulo "${MODULE_NAMES[moduleName] || moduleName}" no está disponible en tu plan ${planConfig.nombre}.`,
      },
    });
  } catch (error) {
    console.error('Error al verificar módulo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso al módulo',
    });
  }
};

/**
 * GET /api/config/check-feature/:featureName
 * Verifica si una característica está disponible
 */
const checkFeatureAccessEndpoint = async (req, res) => {
  try {
    const { featureName } = req.params;
    const empresaId = req.user?.empresa;
    
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
    const available = isFeatureAvailable(planId, featureName);
    
    res.json({
      success: true,
      data: {
        featureName,
        featureNombre: FEATURE_NAMES[featureName] || featureName,
        disponible: available,
        planId,
        planNombre: planConfig.nombre,
        mensaje: available
          ? null
          : `La función "${FEATURE_NAMES[featureName] || featureName}" no está disponible en tu plan ${planConfig.nombre}.`,
      },
    });
  } catch (error) {
    console.error('Error al verificar característica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso a la característica',
    });
  }
};

module.exports = {
  getPlanInfo,
  getAllPlans,
  checkResourceLimitEndpoint,
  checkModuleAccessEndpoint,
  checkFeatureAccessEndpoint,
};
