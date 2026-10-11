const Empresa = require('../models/empresaModel');
const Suscripcion = require('../models/suscripcionModel');
const UsagePeriod = require('../models/usagePeriodModel');
const Cliente = require('../models/clienteModel');
const Producto = require('../models/productoModel');
const Venta = require('../models/ventaModel');
const Cotizacion = require('../models/cotizacionModel');
const Usuario = require('../models/usuarioModel');
const EventoPremium = require('../models/eventoPremiumModel');
const {
  getPlanConfig,
  getLimitsForPlan,
  normalizePlanId,
} = require('../config/plansConfig');

const RESOURCE_CONFIG = {
  cliente: {
    limitKey: 'clientes',
    usageField: 'clientCreations',
    model: Cliente,
    buildActiveQuery: (empresaId) => ({ empresa: empresaId, estado: { $ne: false } }),
  },
  producto: {
    limitKey: 'productos',
    usageField: 'productCreations',
    model: Producto,
    buildActiveQuery: (empresaId) => ({ empresa: empresaId, estado: { $ne: false } }),
  },
  venta: {
    limitKey: 'ventas',
    usageField: 'sales',
    model: Venta,
    buildActiveQuery: () => null,
  },
  cotizacion: {
    limitKey: 'cotizaciones',
    usageField: 'quotes',
    model: Cotizacion,
    buildActiveQuery: () => null,
  },
  evento: {
    limitKey: 'eventos',
    usageField: 'eventCreations',
    model: EventoPremium,
    buildActiveQuery: () => null,
  },
  usuario: {
    limitKey: 'usuarios',
    usageField: null,
    model: Usuario,
    buildActiveQuery: (empresaId) => ({ empresa: empresaId, estado: { $ne: false } }),
  },
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const isSuperAdminCompany = (empresa) => empresa?.nombre === 'SuperAdmin';

function getResourceConfig(resource) {
  const config = RESOURCE_CONFIG[resource];
  if (!config) {
    const err = new Error(`Recurso no soportado en usageLimitService: ${resource}`);
    err.code = 'RESOURCE_NOT_SUPPORTED';
    throw err;
  }
  return config;
}

async function resolveEmpresaAndSubscription(empresaId) {
  const empresa = await Empresa.findById(empresaId);
  if (!empresa) {
    const err = new Error('Empresa no encontrada.');
    err.code = 'EMPRESA_NOT_FOUND';
    throw err;
  }

  const suscripcion = await Suscripcion.findOne({ empresa: empresaId });
  return { empresa, suscripcion };
}

function resolvePeriodWindow({ empresa, suscripcion }) {
  const planId = normalizePlanId(empresa.plan);
  const now = new Date();

  if (planId === 'free_trial') {
    const planConfig = getPlanConfig(planId);
    const periodStart = empresa.fechaCreacion ? new Date(empresa.fechaCreacion) : now;
    return {
      planId,
      periodStart,
      periodEnd: addDays(periodStart, planConfig.duracionDias ?? 7),
      seedReason: 'trial_period',
      suscripcionId: null,
    };
  }

  const paidPeriodStart = empresa.fechaInicioSuscripcion || suscripcion?.fechaInicio || now;
  const paidPeriodEnd =
    empresa.fechaProximoCobro ||
    suscripcion?.fechaProximoCobro ||
    addDays(new Date(paidPeriodStart), 30);

  return {
    planId,
    periodStart: new Date(paidPeriodStart),
    periodEnd: new Date(paidPeriodEnd),
    seedReason: 'subscription_period',
    suscripcionId: suscripcion?._id || null,
  };
}

function normalizePeriodDate(dateLike, fallback = new Date()) {
  const date = dateLike ? new Date(dateLike) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
}

async function createInitialUsagePeriod(empresaId, options = {}) {
  const { empresa, suscripcion } = options.empresa
    ? { empresa: options.empresa, suscripcion: options.suscripcion || null }
    : await resolveEmpresaAndSubscription(empresaId);

  const existing = await UsagePeriod.findOne({ empresa: empresa._id, estado: 'activo' }).sort({ periodStart: -1 });
  if (existing) {
    return existing;
  }

  const period = resolvePeriodWindow({ empresa, suscripcion });

  return UsagePeriod.create({
    empresa: empresa._id,
    suscripcion: period.suscripcionId,
    planId: period.planId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    estado: 'activo',
    usage: {
      clientCreations: 0,
      productCreations: 0,
      sales: 0,
      quotes: 0,
      eventCreations: 0,
    },
    metadata: {
      seedReason: period.seedReason,
      createdFrom: options.createdFrom || 'usageLimitService',
    },
  });
}

async function resolveCurrentPeriod(empresaId, options = {}) {
  const { empresa, suscripcion } = options.empresa
    ? { empresa: options.empresa, suscripcion: options.suscripcion || null }
    : await resolveEmpresaAndSubscription(empresaId);

  const expected = resolvePeriodWindow({ empresa, suscripcion });

  let currentPeriod = await UsagePeriod.findOne({ empresa: empresa._id, estado: 'activo' }).sort({ periodStart: -1 });
  if (!currentPeriod) {
    currentPeriod = await createInitialUsagePeriod(empresa._id, {
      empresa,
      suscripcion,
      createdFrom: 'resolveCurrentPeriod',
    });
  }

  const samePlan = currentPeriod.planId === expected.planId;
  const sameStart = new Date(currentPeriod.periodStart).getTime() === expected.periodStart.getTime();
  const sameEnd = new Date(currentPeriod.periodEnd).getTime() === expected.periodEnd.getTime();

  if (!samePlan || !sameStart || !sameEnd) {
    await UsagePeriod.updateMany(
      { empresa: empresa._id, estado: 'activo', _id: { $ne: currentPeriod._id } },
      { $set: { estado: 'cerrado' } }
    );

    currentPeriod = await UsagePeriod.findByIdAndUpdate(
      currentPeriod._id,
      {
        $set: {
          suscripcion: expected.suscripcionId,
          planId: expected.planId,
          periodStart: expected.periodStart,
          periodEnd: expected.periodEnd,
          metadata: {
            ...(currentPeriod.metadata || {}),
            adjustedBy: 'resolveCurrentPeriod',
            adjustedAt: new Date(),
          },
        },
      },
      { new: true }
    );
  }

  return currentPeriod;
}

async function rotateUsagePeriod(
  empresaId,
  {
    planId,
    periodStart,
    periodEnd,
    suscripcionId = null,
    reason = 'rotation',
    metadata = {},
  } = {}
) {
  const normalizedPlanId = normalizePlanId(planId);
  const nextStart = normalizePeriodDate(periodStart);
  const nextEnd = normalizePeriodDate(periodEnd, addDays(nextStart, 30));

  let activePeriod = await UsagePeriod.findOne({ empresa: empresaId, estado: 'activo' }).sort({ periodStart: -1 });
  if (
    activePeriod &&
    activePeriod.planId === normalizedPlanId &&
    new Date(activePeriod.periodStart).getTime() === nextStart.getTime() &&
    new Date(activePeriod.periodEnd).getTime() === nextEnd.getTime()
  ) {
    return { rotated: false, reason: 'already_aligned', currentPeriod: activePeriod };
  }

  const closedPeriods = [];
  if (activePeriod) {
    activePeriod.estado = 'cerrado';
    activePeriod.metadata = {
      ...(activePeriod.metadata || {}),
      closedBy: reason,
      closedAt: new Date(),
      closeContext: metadata,
    };
    await activePeriod.save();
    closedPeriods.push(activePeriod._id);
  }

  await UsagePeriod.updateMany(
    { empresa: empresaId, estado: 'activo' },
    {
      $set: {
        estado: 'cerrado',
      },
      $currentDate: {
        updatedAt: true,
      },
    }
  );

  const newPeriod = await UsagePeriod.create({
    empresa: empresaId,
    suscripcion: suscripcionId,
    planId: normalizedPlanId,
    periodStart: nextStart,
    periodEnd: nextEnd,
    estado: 'activo',
    usage: {
      clientCreations: 0,
      productCreations: 0,
      sales: 0,
      quotes: 0,
      eventCreations: 0,
    },
    metadata: {
      createdFrom: 'rotateUsagePeriod',
      reason,
      ...metadata,
    },
  });

  return {
    rotated: true,
    reason,
    closedPeriods,
    currentPeriod: newPeriod,
  };
}

async function closeExpiredUsagePeriods({ before = new Date() } = {}) {
  const cutoff = normalizePeriodDate(before);
  const periods = await UsagePeriod.find({
    estado: 'activo',
    periodEnd: { $lt: cutoff },
  }).select('_id empresa planId periodStart periodEnd metadata');

  let closed = 0;

  for (const period of periods) {
    period.estado = 'cerrado';
    period.metadata = {
      ...(period.metadata || {}),
      closedBy: 'closeExpiredUsagePeriods',
      closedAt: new Date(),
    };
    await period.save();
    closed++;
  }

  return {
    scanned: periods.length,
    closed,
  };
}

async function getActiveResourceCount({ empresaId, resource }) {
  const config = getResourceConfig(resource);
  if (typeof config.buildActiveQuery !== 'function') {
    return null;
  }

  const query = config.buildActiveQuery(empresaId);
  if (!query) {
    return null;
  }

  return config.model.countDocuments(query);
}

async function checkResourceLimit({ empresaId, resource, operation = 'create' }) {
  if (operation !== 'create') {
    const err = new Error(`Operación no soportada todavía: ${operation}`);
    err.code = 'UNSUPPORTED_OPERATION';
    throw err;
  }

  const { empresa, suscripcion } = await resolveEmpresaAndSubscription(empresaId);
  if (isSuperAdminCompany(empresa)) {
    return {
      allowed: true,
      planId: 'super',
      activeLimit: -1,
      activeCount: 0,
      activeUnlimited: true,
      periodLimit: -1,
      periodUsage: 0,
      periodUnlimited: true,
      remainingActive: null,
      remainingPeriod: null,
      reason: null,
      currentPeriod: null,
    };
  }

  const currentPeriod = await resolveCurrentPeriod(empresaId, { empresa, suscripcion });
  const config = getResourceConfig(resource);
  const limits = getLimitsForPlan(currentPeriod.planId);
  const resourceLimits = limits[config.limitKey] || {};
  const activeLimit = resourceLimits.activeLimit ?? null;
  const periodLimit = resourceLimits.periodLimit ?? null;
  const activeUnlimited = activeLimit === -1 || activeLimit == null;
  const periodUnlimited = periodLimit === -1 || periodLimit == null;
  const activeCount = await getActiveResourceCount({ empresaId, resource });
  const periodUsage = config.usageField ? currentPeriod.usage?.[config.usageField] || 0 : 0;

  if (!activeUnlimited && activeCount != null && activeCount >= activeLimit) {
    return {
      allowed: false,
      reason: 'ACTIVE_LIMIT_REACHED',
      planId: currentPeriod.planId,
      activeLimit,
      activeCount,
      activeUnlimited,
      periodLimit,
      periodUsage,
      periodUnlimited,
      remainingActive: 0,
      remainingPeriod: periodUnlimited ? null : Math.max(0, periodLimit - periodUsage),
      currentPeriod,
      message: 'Has alcanzado el límite de registros activos permitido por tu plan.',
    };
  }

  if (!periodUnlimited && config.usageField && periodUsage >= periodLimit) {
    return {
      allowed: false,
      reason: 'PERIOD_CREATION_LIMIT_REACHED',
      planId: currentPeriod.planId,
      activeLimit,
      activeCount,
      activeUnlimited,
      periodLimit,
      periodUsage,
      periodUnlimited,
      remainingActive: activeUnlimited || activeCount == null ? null : Math.max(0, activeLimit - activeCount),
      remainingPeriod: 0,
      currentPeriod,
      message: 'Has agotado las altas u operaciones disponibles para el período actual.',
    };
  }

  return {
    allowed: true,
    reason: null,
    planId: currentPeriod.planId,
    activeLimit,
    activeCount,
    activeUnlimited,
    periodLimit,
    periodUsage,
    periodUnlimited,
    remainingActive: activeUnlimited || activeCount == null ? null : Math.max(0, activeLimit - activeCount),
    remainingPeriod: periodUnlimited ? null : Math.max(0, periodLimit - periodUsage),
    currentPeriod,
    message: null,
  };
}

async function consumeResource({ empresaId, resource, operation = 'create' }) {
  if (operation !== 'create') {
    const err = new Error(`Operación no soportada todavía: ${operation}`);
    err.code = 'UNSUPPORTED_OPERATION';
    throw err;
  }

  const { empresa, suscripcion } = await resolveEmpresaAndSubscription(empresaId);
  if (isSuperAdminCompany(empresa)) {
    return { skipped: true, reason: 'SUPERADMIN_BYPASS' };
  }

  const currentPeriod = await resolveCurrentPeriod(empresaId, { empresa, suscripcion });
  const config = getResourceConfig(resource);
  if (!config.usageField) {
    return {
      skipped: true,
      reason: 'NO_PERIOD_COUNTER',
      currentPeriod,
    };
  }

  const limits = getLimitsForPlan(currentPeriod.planId);
  const resourceLimits = limits[config.limitKey] || {};
  const periodLimit = resourceLimits.periodLimit ?? null;
  const query = { _id: currentPeriod._id, estado: 'activo' };

  if (periodLimit != null && periodLimit !== -1) {
    query[`usage.${config.usageField}`] = { $lt: periodLimit };
  }

  const updatedPeriod = await UsagePeriod.findOneAndUpdate(
    query,
    {
      $inc: { [`usage.${config.usageField}`]: 1 },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );

  if (!updatedPeriod) {
    const err = new Error('No fue posible consumir el recurso para el período actual.');
    err.code = 'PERIOD_CREATION_LIMIT_REACHED';
    throw err;
  }

  return {
    skipped: false,
    currentPeriod: updatedPeriod,
    usageField: config.usageField,
    periodUsage: updatedPeriod.usage?.[config.usageField] || 0,
  };
}

async function getUsageSnapshot(empresaId, options = {}) {
  const { empresa, suscripcion } = options.empresa
    ? { empresa: options.empresa, suscripcion: options.suscripcion || null }
    : await resolveEmpresaAndSubscription(empresaId);

  if (isSuperAdminCompany(empresa)) {
    return {
      currentPeriod: null,
      resources: {},
    };
  }

  const currentPeriod = await resolveCurrentPeriod(empresaId, { empresa, suscripcion });
  const limits = getLimitsForPlan(currentPeriod.planId);
  const resources = {};

  for (const [resourceType, config] of Object.entries(RESOURCE_CONFIG)) {
    const resourceLimits = limits[config.limitKey] || {};
    const activeLimit = resourceLimits.activeLimit ?? null;
    const periodLimit = resourceLimits.periodLimit ?? null;
    const activeUnlimited = activeLimit === -1 || activeLimit == null;
    const periodUnlimited = periodLimit === -1 || periodLimit == null;
    const activeCount = await getActiveResourceCount({ empresaId, resource: resourceType });
    const periodUsage = config.usageField ? currentPeriod.usage?.[config.usageField] || 0 : null;

    resources[config.limitKey] = {
      resourceType,
      activeCount,
      activeLimit,
      activeUnlimited,
      remainingActive:
        activeCount == null || activeUnlimited ? null : Math.max(0, activeLimit - activeCount),
      activePercentage:
        activeCount == null || activeUnlimited || activeLimit <= 0
          ? 0
          : Math.min(100, Math.round((activeCount / activeLimit) * 100)),
      periodUsage,
      periodLimit,
      periodUnlimited,
      remainingPeriod:
        periodUsage == null || periodUnlimited ? null : Math.max(0, periodLimit - periodUsage),
      periodPercentage:
        periodUsage == null || periodUnlimited || periodLimit <= 0
          ? 0
          : Math.min(100, Math.round((periodUsage / periodLimit) * 100)),
    };
  }

  return {
    currentPeriod,
    resources,
  };
}

module.exports = {
  RESOURCE_CONFIG,
  createInitialUsagePeriod,
  resolveCurrentPeriod,
  rotateUsagePeriod,
  closeExpiredUsagePeriods,
  getActiveResourceCount,
  getUsageSnapshot,
  checkResourceLimit,
  consumeResource,
};
