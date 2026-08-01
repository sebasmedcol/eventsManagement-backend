/**
 * Middleware para verificar límites y acceso según el plan de suscripción.
 *
 * AJUSTE ESPECIAL — Empresa "SuperAdmin":
 * Si la empresa del usuario se llama "SuperAdmin", todos los chequeos de
 * límites y módulos se saltan automáticamente: acceso total e ilimitado.
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

const Cliente      = require('../models/clienteModel');
const Producto     = require('../models/productoModel');
const Venta        = require('../models/ventaModel');
const Cotizacion   = require('../models/cotizacionModel');
const Usuario      = require('../models/usuarioModel');
const Consecutivo  = require('../models/consecutivoModel');
const Factura      = require('../models/facturaModel');
const EventoPremium = require('../models/eventoPremiumModel');
const Empresa      = require('../models/empresaModel');

// ─── Helpers ────────────────────────────────────────────────────────────────

const RESOURCE_MODEL_MAP = {
  cliente:     { model: Cliente,       empresaField: 'empresa', estadoField: 'estado' },
  producto:    { model: Producto,      empresaField: 'empresa', estadoField: 'estado' },
  venta:       { model: Venta,         empresaField: 'empresa', estadoField: 'estado' },
  cotizacion:  { model: Cotizacion,    empresaField: 'empresa', estadoField: null },
  usuario:     { model: Usuario,       empresaField: 'empresa', estadoField: 'estado' },
  consecutivo: { model: Consecutivo,   empresaField: 'empresa', estadoField: 'estado' },
  factura:     { model: Factura,       empresaField: 'empresa', estadoField: 'estado' },
  evento:      { model: EventoPremium, empresaField: 'empresa', estadoField: 'estado' },
};

async function getResourceCount(resourceType, empresaId) {
  const config = RESOURCE_MODEL_MAP[resourceType];
  if (!config) {
    console.warn(`Tipo de recurso no configurado: ${resourceType}`);
    return 0;
  }
  try {
    const query = { [config.empresaField]: empresaId };
    if (config.estadoField) query[config.estadoField] = { $ne: false };
    return await config.model.countDocuments(query);
  } catch (error) {
    console.error(`Error al contar ${resourceType}:`, error);
    return 0;
  }
}

async function getAllResourceUsage(empresaId) {
  const usage = {};
  const countPromises = Object.keys(RESOURCE_MODEL_MAP).map(async (resourceType) => {
    const count = await getResourceCount(resourceType, empresaId);
    const limitKey = RESOURCE_TO_LIMIT_MAP[resourceType];
    if (limitKey) usage[limitKey] = count;
  });
  await Promise.all(countPromises);
  return usage;
}

/** Devuelve true si la empresa es la cuenta SuperAdmin global */
function esSuperAdmin(empresa) {
  return empresa && empresa.nombre === 'SuperAdmin';
}

// Métodos de "lectura": nunca se bloquean por vencimiento de plan.
const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const isReadRequest = (req) => READ_METHODS.includes(req.method);

// ─── Middlewares ─────────────────────────────────────────────────────────────

/**
 * Adjunta información del plan al request.
 * Para SuperAdmin, marca isSuperAdmin = true y no calcula trial.
 */
const attachPlanInfo = async (req, res, next) => {
  try {
    const empresaId = req.user?.empresaId || req.user?.empresa;
    if (!empresaId) return next();

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return next();

    // ── SuperAdmin bypass ──────────────────────────────────────────────────
    if (esSuperAdmin(empresa)) {
      req.planInfo = {
        planId: 'super',
        isSuperAdmin: true,
        empresaId,
        trialStatus: null,
      };
      return next();
    }
    // ──────────────────────────────────────────────────────────────────────

    const planId = normalizePlanId(empresa.plan);
    const planConfig = getPlanConfig(planId);

    let trialStatus = null;
    if (planId === 'free_trial' && empresa.fechaCreacion) {
      trialStatus = calculateTrialStatus(empresa.fechaCreacion, planConfig.duracionDias ?? 7);
      if (trialStatus.expirado) req.trialExpired = true;
    }

    req.planInfo = { planId, planConfig, empresaId, trialStatus };
    next();
  } catch (error) {
    console.error('Error en attachPlanInfo middleware:', error);
    next();
  }
};

/**
 * Factory: verifica límite antes de crear un recurso.
 * SuperAdmin siempre puede crear sin restricciones.
 */
const checkLimitMiddleware = (resourceType) => {
  return async (req, res, next) => {
    try {
      const empresaId = req.user?.empresaId || req.user?.empresa;
      if (!empresaId) {
        return res.status(401).json({ success: false, message: 'No autorizado: empresa no identificada' });
      }

      const empresa = await Empresa.findById(empresaId);
      if (!empresa) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      // ── SuperAdmin bypass ────────────────────────────────────────────────
      if (esSuperAdmin(empresa)) {
        req.limitInfo = { resourceType, allowed: true, unlimited: true };
        return next();
      }
      // ────────────────────────────────────────────────────────────────────

const estadoSus = empresa.estadoSuscripcion;

      if (estadoSus === 'expirada' || estadoSus === 'cancelada') {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Tu suscripción ha expirado. Renueva tu plan para continuar usando NextEvents.',
          estadoSuscripcion: estadoSus,
        });
      }

      if (estadoSus === 'past_due') {
        const diasMora = empresa.fechaProximoCobro
          ? Math.floor((Date.now() - new Date(empresa.fechaProximoCobro).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        if (diasMora > 7) {
          return res.status(403).json({
            success: false,
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Tu pago está vencido y el período de gracia ha expirado. Actualiza tu método de pago.',
            estadoSuscripcion: estadoSus,
            diasMora,
          });
        }
        req.paymentPastDue = true;
        req.diasMoraPago = diasMora;
      }

      const planId = normalizePlanId(empresa.plan);
      const planConfig = getPlanConfig(planId);

      if (planId === 'free_trial') {
        const trialStatus = calculateTrialStatus(empresa.fechaCreacion, planConfig.duracionDias ?? 7);
        if (trialStatus.expirado) {
          return res.status(403).json({
            success: false,
            code: 'TRIAL_EXPIRED',
            message: 'Tu período de prueba ha expirado. Por favor, selecciona un plan para continuar.',
          });
        }
      }

      const currentCount = await getResourceCount(resourceType, empresaId);
      const limitCheck   = checkResourceLimit(planId, resourceType, currentCount);

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

      req.limitInfo = { resourceType, ...limitCheck };
      next();
    } catch (error) {
      console.error(`Error en checkLimitMiddleware (${resourceType}):`, error);
      res.status(500).json({ success: false, message: 'Error al verificar límites del plan' });
    }
  };
};

/**
 * Factory: verifica acceso a un módulo.
 * SuperAdmin siempre tiene acceso a cualquier módulo.
 *
 * Comportamiento según estado de suscripción:
 *   - trial expirado / expirada / cancelada:
 *       GET / HEAD / OPTIONS → se permite (modo solo lectura)
 *       POST / PUT / DELETE / PATCH → 403
 *   - past_due ≤ 7 días: acceso completo + req.paymentPastDue = true
 *   - past_due > 7 días: igual que expirada
 */
const checkModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      const empresaId = req.user?.empresaId || req.user?.empresa;
      if (!empresaId) {
        return res.status(401).json({ success: false, message: 'No autorizado: empresa no identificada' });
      }

      const empresa = await Empresa.findById(empresaId);
      if (!empresa) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      // ── SuperAdmin bypass ────────────────────────────────────────────────
      if (esSuperAdmin(empresa)) return next();
      // ────────────────────────────────────────────────────────────────────

      // ── Verificación estado suscripción ──────────────────────────────────
      const estadoSus = empresa.estadoSuscripcion;

      if (estadoSus === 'expirada' || estadoSus === 'cancelada') {
        if (isReadRequest(req)) {           // GET/HEAD/OPTIONS permitido (solo lectura)
          req.subscriptionExpired = true;
          req.readOnlyMode = true;
          return next();
        }
        return res.status(403).json({        // mutaciones bloqueadas
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Tu suscripción ha expirado. Renueva tu plan para volver a gestionar tu información.',
          estadoSuscripcion: estadoSus,
        });
      }

      if (estadoSus === 'past_due') {
        const diasMora = empresa.fechaProximoCobro
          ? Math.floor((Date.now() - new Date(empresa.fechaProximoCobro).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        if (diasMora > 7) {
          if (isReadRequest(req)) {
            req.paymentPastDue = true;
            req.subscriptionExpired = true;
            req.readOnlyMode = true;
            return next();
          }
          return res.status(403).json({
            success: false,
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Tu pago está vencido y el período de gracia ha expirado. Actualiza tu método de pago para seguir gestionando.',
            estadoSuscripcion: estadoSus,
            diasMora,
          });
        }
        // Dentro del período de gracia: acceso completo + marcar
        req.paymentPastDue = true;
        req.diasMoraPago = diasMora;
      }
      // ─────────────────────────────────────────────────────────────────────

      const planId = normalizePlanId(empresa.plan);
      const planConfig = getPlanConfig(planId);

      if (planId === 'free_trial') {
        const trialStatus = calculateTrialStatus(empresa.fechaCreacion, planConfig.duracionDias ?? 7);
        if (trialStatus.expirado) {
          // Permitir lecturas (GET/HEAD/OPTIONS) aunque el trial haya expirado
          if (isReadRequest(req)) {
            req.trialExpired = true;
            req.readOnlyMode = true;
            return next();
          }
          return res.status(403).json({
            success: false,
            code: 'TRIAL_EXPIRED',
            message: 'Tu período de prueba ha expirado. Selecciona un plan para volver a gestionar tu información.',
          });
        }
      }

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
      res.status(500).json({ success: false, message: 'Error al verificar acceso al módulo' });
    }
  };
};

/**
 * Factory: verifica acceso a una característica.
 * SuperAdmin siempre tiene acceso.
 */
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const empresaId = req.user?.empresaId || req.user?.empresa;
      if (!empresaId) {
        return res.status(401).json({ success: false, message: 'No autorizado: empresa no identificada' });
      }

      const empresa = await Empresa.findById(empresaId);
      if (!empresa) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      // ── SuperAdmin bypass ────────────────────────────────────────────────
      if (esSuperAdmin(empresa)) return next();
      // ────────────────────────────────────────────────────────────────────

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
      res.status(500).json({ success: false, message: 'Error al verificar acceso a la característica' });
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