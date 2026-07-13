/**
 * Controlador para información del plan de suscripción.
 *
 * AJUSTE ESPECIAL — Empresa "SuperAdmin":
 * Cuando la empresa es SuperAdmin, getPlanInfo devuelve todos los módulos
 * disponibles con límites infinitos y la flag isSuperAdmin = true.
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

/** Devuelve true si la empresa es la cuenta SuperAdmin global */
const esSuperAdmin = (empresa) => empresa && empresa.nombre === 'SuperAdmin';

/**
 * GET /api/config/plan-info
 * Obtiene información completa del plan actual de la empresa.
 * Para SuperAdmin: todos los módulos disponibles, sin límites.
 */
const getPlanInfo = async (req, res) => {
  try {
    const empresaId = req.user?.empresa;
    if (!empresaId) {
      return res.status(401).json({ success: false, message: 'No autorizado: empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    // ── SuperAdmin: acceso total ilimitado ───────────────────────────────
    if (esSuperAdmin(empresa)) {
      // Construir objeto de módulos con todos en true
      const todosLosModulos = Object.keys(PLANS_CONFIG.premium.modulos).reduce((acc, key) => {
        acc[key] = { disponible: true, nombre: MODULE_NAMES[key] || key };
        return acc;
      }, {});

      // Construir objeto de características con todas en true
      const todasLasCaracteristicas = Object.keys(PLANS_CONFIG.premium.caracteristicas).reduce((acc, key) => {
        acc[key] = { disponible: true, nombre: FEATURE_NAMES[key] || key };
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          plan: {
            id: 'super',
            nombre: 'SuperAdmin',
            descripcion: 'Acceso total e ilimitado',
            precio: 0,
          },
          modulos: todosLosModulos,
          caracteristicas: todasLasCaracteristicas,
          limites: {},        // Sin límites
          trial: null,
          periodoActual: null,
          upgrade: null,
          isSuperAdmin: true, // Flag para el frontend
          fechaConsulta: new Date().toISOString(),
        },
      });
    }
    // ────────────────────────────────────────────────────────────────────

    const planId = normalizePlanId(empresa.plan);
    const planConfig = getPlanConfig(planId);
    const usage = await getAllResourceUsage(empresaId);
    const limitsWithUsage = getAllLimitsWithUsage(planId, usage);

    let trialStatus = null;
    if (planId === 'free_trial' && empresa.fechaCreacion) {
      trialStatus = calculateTrialStatus(empresa.fechaCreacion, planConfig.duracionDias || 14);
    }

    // Días restantes del período actual, para CUALQUIER plan (no solo trial).
    // - Si es free_trial: se reutiliza el cálculo de trialStatus.
    // - Si es un plan pago (basico/pro/premium): se calcula comparando la
    //   fecha actual del servidor contra `empresa.fechaProximoCobro`, que es
    //   la fecha del próximo cobro guardada en la BD (se actualiza en cada
    //   ciclo de facturación desde suscripcionService).
    let periodoActual = null;
    if (trialStatus) {
      periodoActual = {
        diasRestantes: trialStatus.diasRestantes,
        fechaFin: trialStatus.fechaExpiracion,
        expirado: trialStatus.expirado,
      };
    } else {
      // Fecha de referencia para el fin del período actual: se prioriza el
      // próximo cobro real; si la empresa no pasó por el flujo de pago
      // (ej. plan asignado manualmente), se estima a partir del inicio de
      // la suscripción o, en su defecto, de la fecha de creación de la
      // empresa, usando el mismo ciclo de 30 días que usa el resto del
      // sistema (ver calcularFechaProximoCobro en suscripcionService).
      const fechaBase =
        empresa.fechaProximoCobro ||
        (empresa.fechaInicioSuscripcion
          ? new Date(new Date(empresa.fechaInicioSuscripcion).getTime() + 30 * 24 * 60 * 60 * 1000)
          : null) ||
        (empresa.fechaCreacion
          ? new Date(new Date(empresa.fechaCreacion).getTime() + 30 * 24 * 60 * 60 * 1000)
          : null);

      if (fechaBase) {
        const ahora = new Date();
        const fechaFin = new Date(fechaBase);
        const msRestantes = fechaFin.getTime() - ahora.getTime();
        const diasRestantes = Math.max(0, Math.ceil(msRestantes / (1000 * 60 * 60 * 24)));
        periodoActual = {
          diasRestantes,
          fechaFin,
          expirado: msRestantes <= 0,
        };
      }
    }

    const recommendedUpgrade = getRecommendedUpgrade(planId, usage);
    const recommendedPlan = recommendedUpgrade ? getPlanConfig(recommendedUpgrade) : null;

    res.json({
      success: true,
      data: {
        plan: {
          id: planId,
          nombre: planConfig.nombre,
          descripcion: planConfig.descripcion,
          precio: planConfig.precio || 0,
        },
        modulos: Object.entries(planConfig.modulos).reduce((acc, [key, value]) => {
          acc[key] = { disponible: value, nombre: MODULE_NAMES[key] || key };
          return acc;
        }, {}),
        caracteristicas: Object.entries(planConfig.caracteristicas).reduce((acc, [key, value]) => {
          acc[key] = { disponible: value, nombre: FEATURE_NAMES[key] || key };
          return acc;
        }, {}),
        limites: limitsWithUsage,
        trial: trialStatus,
        periodoActual,
        upgrade: recommendedPlan ? {
          recomendado: true,
          planId: recommendedUpgrade,
          planNombre: recommendedPlan.nombre,
          precio: recommendedPlan.precio,
          razon: 'Estás cerca de alcanzar los límites de tu plan actual',
        } : null,
        isSuperAdmin: false,
        fechaConsulta: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error al obtener información del plan:', error);
    res.status(500).json({ success: false, message: 'Error al obtener información del plan' });
  }
};

/**
 * GET /api/config/plans
 * Obtiene todos los planes disponibles para comparación (solo admin principal).
 */
const getAllPlans = async (req, res) => {
  try {
    const empresaId = req.user?.empresa;
    let currentPlanId = 'free_trial';

    if (empresaId) {
      const empresa = await Empresa.findById(empresaId);
      if (empresa) {
        currentPlanId = esSuperAdmin(empresa) ? 'super' : normalizePlanId(empresa.plan);
      }
    }

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

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener planes disponibles' });
  }
};

/**
 * GET /api/config/check-limit/:resourceType
 */
const checkResourceLimitEndpoint = async (req, res) => {
  try {
    const { resourceType } = req.params;
    const empresaId = req.user?.empresa;

    if (!empresaId) {
      return res.status(401).json({ success: false, message: 'No autorizado: empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    if (esSuperAdmin(empresa)) {
      return res.json({
        success: true,
        data: { resourceType, planId: 'super', planNombre: 'SuperAdmin', allowed: true, unlimited: true },
      });
    }

    const planId = normalizePlanId(empresa.plan);
    const planConfig = getPlanConfig(planId);
    const { getResourceCount } = require('../middlewares/planMiddleware');
    const { checkResourceLimit: checkLimit } = require('../config/plansConfig');

    const currentCount = await getResourceCount(resourceType, empresaId);
    const limitCheck   = checkLimit(planId, resourceType, currentCount);

    res.json({
      success: true,
      data: { resourceType, planId, planNombre: planConfig.nombre, ...limitCheck },
    });
  } catch (error) {
    console.error('Error al verificar límite:', error);
    res.status(500).json({ success: false, message: 'Error al verificar límite del recurso' });
  }
};

/**
 * GET /api/config/check-module/:moduleName
 */
const checkModuleAccessEndpoint = async (req, res) => {
  try {
    const { moduleName } = req.params;
    const empresaId = req.user?.empresa;

    if (!empresaId) {
      return res.status(401).json({ success: false, message: 'No autorizado: empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    if (esSuperAdmin(empresa)) {
      return res.json({
        success: true,
        data: { moduleName, moduleNombre: MODULE_NAMES[moduleName] || moduleName, disponible: true, planId: 'super', planNombre: 'SuperAdmin', mensaje: null },
      });
    }

    const planId    = normalizePlanId(empresa.plan);
    const planConfig = getPlanConfig(planId);
    const available  = isModuleAvailable(planId, moduleName);

    res.json({
      success: true,
      data: {
        moduleName,
        moduleNombre: MODULE_NAMES[moduleName] || moduleName,
        disponible: available,
        planId,
        planNombre: planConfig.nombre,
        mensaje: available ? null : `El módulo "${MODULE_NAMES[moduleName] || moduleName}" no está disponible en tu plan ${planConfig.nombre}.`,
      },
    });
  } catch (error) {
    console.error('Error al verificar módulo:', error);
    res.status(500).json({ success: false, message: 'Error al verificar acceso al módulo' });
  }
};

/**
 * GET /api/config/check-feature/:featureName
 */
const checkFeatureAccessEndpoint = async (req, res) => {
  try {
    const { featureName } = req.params;
    const empresaId = req.user?.empresa;

    if (!empresaId) {
      return res.status(401).json({ success: false, message: 'No autorizado: empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    if (esSuperAdmin(empresa)) {
      return res.json({
        success: true,
        data: { featureName, featureNombre: FEATURE_NAMES[featureName] || featureName, disponible: true, planId: 'super', planNombre: 'SuperAdmin', mensaje: null },
      });
    }

    const planId    = normalizePlanId(empresa.plan);
    const planConfig = getPlanConfig(planId);
    const available  = isFeatureAvailable(planId, featureName);

    res.json({
      success: true,
      data: {
        featureName,
        featureNombre: FEATURE_NAMES[featureName] || featureName,
        disponible: available,
        planId,
        planNombre: planConfig.nombre,
        mensaje: available ? null : `La función "${FEATURE_NAMES[featureName] || featureName}" no está disponible en tu plan ${planConfig.nombre}.`,
      },
    });
  } catch (error) {
    console.error('Error al verificar característica:', error);
    res.status(500).json({ success: false, message: 'Error al verificar acceso a la característica' });
  }
};

module.exports = {
  getPlanInfo,
  getAllPlans,
  checkResourceLimitEndpoint,
  checkModuleAccessEndpoint,
  checkFeatureAccessEndpoint,
};