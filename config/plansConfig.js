/**
 * Configuración central de planes de suscripción para NextEvents
 * Define límites, módulos disponibles y características por plan
 *
 * AJUSTES APLICADOS:
 * - FREE TRIAL: acceso completo a TODOS los módulos (incluye eventosPremium y roles)
 *   → Es una prueba real, el usuario puede hacer absolutamente todo.
 * - BÁSICO: se activan roles y permisos, se desactiva configuracion.
 */

const PLANS_CONFIG = {
  // Plan de prueba gratuita (7 días) — acceso TOTAL para evaluar la plataforma
  free_trial: {
    nombre: 'Prueba Gratuita',
    slogan: 'Conoce toda la plataforma',
    descripcion: 'Acceso completo por 7 días para evaluar la plataforma',
    duracionDias: 7,
    precio: 0,
    precioCents: 0,
    wompiReferencePrefix: 'PLAN-TRIAL',
    limites: {
      empresas: 1,
      clientes: 30,
      productos: 20,
      ventas: 10,
      eventos: 3,
      cotizaciones: 10,
      usuarios: 2,
      consecutivos: 1,
      facturas: 10,
    },
    modulos: {
      dashboard: true,
      clientes: true,
      productos: true,
      servicios: true,
      ventas: true,
      eventos: true,
      eventosPremium: true,      // ✅ ACTIVADO — prueba incluye todo
      cotizaciones: true,
      calendario: true,
      facturacion: true,
      consecutivos: true,
      reportes: true,
      reportesAvanzados: true,
      usuarios: true,
      roles: true,               // ✅ ACTIVADO — prueba incluye todo
      configuracion: true,
      integraciones: true,
      api: true,
      backups: true,
      auditoria: true,
      logisticaAvanzada: true,
      seguimientoTareas: true,
      estadisticasAvanzadas: true,
    },
    caracteristicas: {
      exportarExcel: true,
      exportarPDF: true,
      notificacionesEmail: true,
      notificacionesSMS: true,
      personalizacionMarca: true,
      soportePrioritario: true,
      capacitacion: true,
      brandingPersonalizado: true,
      automatizacionWhatsApp: true,
      herramientasIA: true,
    },
    restriccionAlExpirar: 'lectura_solo',
  },

  // Plan Básico
  basico: {
    nombre: 'Básico',
    slogan: 'Organiza tu operación diaria',
    descripcion: 'Ideal para pequeños negocios de eventos, DJs, decoradores',
    precio: 30000,
    precioCents: 3000000,
    wompiReferencePrefix: 'PLAN-BASICO',
    perfilCliente: 'Pequeños negocios, DJs, decoradores, operadores pequeños',
    limites: {
      clientes: 100,
      productos: 50,
      ventas: 50,
      eventos: 3,
      cotizaciones: 50,
      usuarios: 2,
      consecutivos: 3,
      facturas: 50,
    },
    modulos: {
      dashboard: true,
      clientes: true,
      productos: true,
      servicios: true,
      ventas: true,
      eventos: true,
      eventosPremium: false,     // ❌ No incluido en básico
      cotizaciones: true,
      calendario: true,
      facturacion: true,
      consecutivos: true,
      reportes: true,
      reportesAvanzados: false,
      usuarios: true,
      roles: true,               // ✅ ACTIVADO — básico incluye roles y permisos
      configuracion: false,      // ❌ DESACTIVADO — configuracion no incluida en básico
      integraciones: false,
      api: false,
      backups: false,
      auditoria: false,
      logisticaAvanzada: false,
      seguimientoTareas: false,
      estadisticasAvanzadas: false,
    },
    caracteristicas: {
      exportarExcel: true,
      exportarPDF: true,
      notificacionesEmail: true,
      notificacionesSMS: false,
      personalizacionMarca: false,
      soportePrioritario: false,
      capacitacion: false,
      brandingPersonalizado: false,
      automatizacionWhatsApp: false,
      herramientasIA: false,
    },
  },

  // Plan Pro
  pro: {
    nombre: 'Pro',
    slogan: 'Escala y automatiza tu negocio',
    descripcion: 'Para empresas en crecimiento con necesidades avanzadas',
    precio: 80000,
    precioCents: 8000000,
    wompiReferencePrefix: 'PLAN-PRO',
    perfilCliente: 'Empresas con flujo constante, operadores medianos, agencias',
    limites: {
      clientes: 500,
      productos: 300,
      ventas: 300,
      eventos: 10,
      cotizaciones: 300,
      usuarios: 5,
      consecutivos: 10,
      facturas: 300,
    },
    modulos: {
      dashboard: true,
      clientes: true,
      productos: true,
      servicios: true,
      ventas: true,
      eventos: true,
      eventosPremium: true,
      cotizaciones: true,
      calendario: true,
      facturacion: true,
      consecutivos: true,
      reportes: true,
      reportesAvanzados: true,
      usuarios: true,
      roles: true,
      configuracion: true,
      integraciones: true,
      api: false,
      backups: true,
      auditoria: true,
      logisticaAvanzada: true,
      seguimientoTareas: true,
      estadisticasAvanzadas: true,
    },
    caracteristicas: {
      exportarExcel: true,
      exportarPDF: true,
      notificacionesEmail: true,
      notificacionesSMS: true,
      personalizacionMarca: true,
      soportePrioritario: false,
      capacitacion: false,
      brandingPersonalizado: false,
      automatizacionWhatsApp: false,
      herramientasIA: false,
    },
  },

  // Plan Premium
  premium: {
    nombre: 'Premium',
    slogan: 'Operación empresarial sin límites',
    descripcion: 'Solución completa sin límites para grandes empresas',
    precio: 180000,
    precioCents: 18000000,
    wompiReferencePrefix: 'PLAN-PREMIUM',
    perfilCliente: 'Empresas grandes, operadores con alto volumen, agencias múltiples',
    limites: {
      clientes: -1,
      productos: -1,
      ventas: -1,
      eventos: -1,
      cotizaciones: -1,
      usuarios: 10,
      consecutivos: -1,
      facturas: -1,
    },
    modulos: {
      dashboard: true,
      clientes: true,
      productos: true,
      servicios: true,
      ventas: true,
      eventos: true,
      eventosPremium: true,
      cotizaciones: true,
      calendario: true,
      facturacion: true,
      consecutivos: true,
      reportes: true,
      reportesAvanzados: true,
      usuarios: true,
      roles: true,
      configuracion: true,
      integraciones: true,
      api: true,
      backups: true,
      auditoria: true,
      logisticaAvanzada: true,
      seguimientoTareas: true,
      estadisticasAvanzadas: true,
    },
    caracteristicas: {
      exportarExcel: true,
      exportarPDF: true,
      notificacionesEmail: true,
      notificacionesSMS: true,
      personalizacionMarca: true,
      soportePrioritario: true,
      capacitacion: true,
      brandingPersonalizado: true,
      automatizacionWhatsApp: true,
      herramientasIA: true,
      backupsAutomaticos: true,
      accesoAnticipado: true,
    },
  },
};

// Mapeo de rutas de sidebar a módulos
const ROUTE_TO_MODULE_MAP = {
  '/dashboard': 'dashboard',
  '/clientes': 'clientes',
  '/productos': 'productos',
  '/servicios': 'servicios',
  '/ventas': 'ventas',
  '/eventos': 'eventos',
  '/eventos-premium': 'eventosPremium',
  '/cotizaciones': 'cotizaciones',
  '/calendario': 'calendario',
  '/facturacion': 'facturacion',
  '/consecutivos': 'consecutivos',
  '/reportes': 'reportes',
  '/reportes-avanzados': 'reportesAvanzados',
  '/usuarios': 'usuarios',
  '/roles': 'roles',
  '/configuracion': 'configuracion',
  '/configuraciones': 'configuracion',
  '/integraciones': 'integraciones',
  '/api': 'api',
  '/backups': 'backups',
  '/auditoria': 'auditoria',
  '/disponibilidad': 'eventos',
};

const RESOURCE_TO_LIMIT_MAP = {
  cliente: 'clientes',
  producto: 'productos',
  servicio: 'productos',
  venta: 'ventas',
  evento: 'eventos',
  cotizacion: 'cotizaciones',
  usuario: 'usuarios',
  consecutivo: 'consecutivos',
  factura: 'facturas',
};

const RESOURCE_NAMES = {
  clientes: 'clientes',
  productos: 'productos',
  servicios: 'servicios',
  ventas: 'ventas',
  eventos: 'eventos',
  cotizaciones: 'cotizaciones',
  usuarios: 'usuarios',
  consecutivos: 'consecutivos',
  facturas: 'facturas',
  empresas: 'empresas',
};

const MODULE_NAMES = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  productos: 'Productos',
  servicios: 'Servicios',
  ventas: 'Ventas',
  eventos: 'Eventos',
  eventosPremium: 'Eventos Premium',
  cotizaciones: 'Cotizaciones',
  calendario: 'Calendario',
  facturacion: 'Facturación',
  consecutivos: 'Consecutivos',
  reportes: 'Reportes',
  reportesAvanzados: 'Reportes Avanzados',
  usuarios: 'Usuarios',
  roles: 'Roles y Permisos',
  configuracion: 'Configuración',
  integraciones: 'Integraciones',
  api: 'Acceso API',
  backups: 'Respaldos',
  auditoria: 'Auditoría',
  logisticaAvanzada: 'Logística Avanzada',
  seguimientoTareas: 'Seguimiento de Tareas',
  estadisticasAvanzadas: 'Estadísticas Avanzadas',
};

const FEATURE_NAMES = {
  exportarExcel: 'Exportar a Excel',
  exportarPDF: 'Exportar a PDF',
  notificacionesEmail: 'Notificaciones por Email',
  notificacionesSMS: 'Notificaciones por SMS',
  personalizacionMarca: 'Personalización de Marca',
  soportePrioritario: 'Soporte Prioritario',
  capacitacion: 'Capacitación Incluida',
  brandingPersonalizado: 'Branding Personalizado',
  automatizacionWhatsApp: 'Automatización de WhatsApp',
  herramientasIA: 'Herramientas de IA',
  backupsAutomaticos: 'Backups Automáticos',
  accesoAnticipado: 'Acceso Anticipado a Funciones',
};

function getPlanConfig(planId) {
  const normalizedPlanId = normalizePlanId(planId);
  return PLANS_CONFIG[normalizedPlanId] || PLANS_CONFIG.free_trial;
}

function normalizePlanId(planId) {
  if (!planId) return 'free_trial';

  const planMap = {
    'default': 'free_trial',
    'free': 'free_trial',
    'free_trial': 'free_trial',
    'trial': 'free_trial',
    'basic': 'basico',
    'basico': 'basico',
    'pro': 'pro',
    'premium': 'premium',
    'super': 'premium', // super mapea a premium como base, pero el middleware lo intercepta antes
  };

  return planMap[planId.toLowerCase()] || 'free_trial';
}

function isModuleAvailable(planId, moduleName) {
  const plan = getPlanConfig(planId);
  return plan.modulos[moduleName] === true;
}

function isFeatureAvailable(planId, featureName) {
  const plan = getPlanConfig(planId);
  return plan.caracteristicas[featureName] === true;
}

function getResourceLimit(planId, resourceType) {
  const plan = getPlanConfig(planId);
  const limitKey = RESOURCE_TO_LIMIT_MAP[resourceType] || resourceType;
  return plan.limites[limitKey] ?? 0;
}

function checkResourceLimit(planId, resourceType, currentCount) {
  const limit = getResourceLimit(planId, resourceType);
  const resourceName = RESOURCE_NAMES[RESOURCE_TO_LIMIT_MAP[resourceType] || resourceType] || resourceType;

  if (limit === -1) {
    return { allowed: true, limit: -1, current: currentCount, unlimited: true, message: null };
  }

  const allowed = currentCount < limit;
  const plan = getPlanConfig(planId);

  return {
    allowed,
    limit,
    current: currentCount,
    unlimited: false,
    remaining: Math.max(0, limit - currentCount),
    percentage: Math.round((currentCount / limit) * 100),
    message: allowed
      ? null
      : `Has alcanzado el límite de ${resourceName} para tu plan ${plan.nombre} (${currentCount}/${limit}). Mejora tu plan para agregar más.`,
  };
}

function getAllLimitsWithUsage(planId, usage = {}) {
  const plan = getPlanConfig(planId);
  const limits = {};

  Object.keys(plan.limites).forEach(resource => {
    const limit = plan.limites[resource];
    const current = usage[resource] || 0;
    const unlimited = limit === -1;

    limits[resource] = {
      limit,
      current,
      unlimited,
      remaining: unlimited ? null : Math.max(0, limit - current),
      percentage: unlimited ? 0 : Math.round((current / limit) * 100),
      canCreate: unlimited || current < limit,
      displayName: RESOURCE_NAMES[resource] || resource,
    };
  });

  return limits;
}

function calculateTrialStatus(fechaInicio, duracionDias = 7) {
  const inicio = new Date(fechaInicio);
  const expiracion = new Date(inicio);
  expiracion.setDate(expiracion.getDate() + duracionDias);

  const ahora = new Date();
  const diferencia = expiracion - ahora;
  const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

  return {
    diasRestantes: Math.max(0, diasRestantes),
    expirado: diasRestantes <= 0,
    fechaExpiracion: expiracion,
    porcentajeTranscurrido: Math.min(100, Math.round(((duracionDias - diasRestantes) / duracionDias) * 100)),
  };
}

function getRecommendedUpgrade(currentPlanId, usage = {}) {
  const planOrder = ['free_trial', 'basico', 'pro', 'premium'];
  const currentIndex = planOrder.indexOf(normalizePlanId(currentPlanId));

  if (currentIndex === planOrder.length - 1) return null;

  const currentPlan = getPlanConfig(currentPlanId);
  let needsUpgrade = false;

  Object.keys(usage).forEach(resource => {
    const limit = currentPlan.limites[resource];
    if (limit !== -1 && limit > 0 && usage[resource] >= limit * 0.8) {
      needsUpgrade = true;
    }
  });

  return needsUpgrade ? planOrder[currentIndex + 1] : null;
}

function getPlanPriceCents(planId) {
  const plan = getPlanConfig(planId);
  return plan.precioCents ?? 0;
}

function isPaidPlan(planId) {
  const normalized = normalizePlanId(planId);
  return normalized !== 'free_trial' && getPlanPriceCents(normalized) > 0;
}

function generatePaymentReference(planId, empresaId) {
  const plan = getPlanConfig(planId);
  const prefix = plan.wompiReferencePrefix || 'PLAN';
  const ts = Date.now().toString(36);
  const emp = String(empresaId).slice(-6);
  return `${prefix}-${emp}-${ts}`.toUpperCase();
}

module.exports = {
  PLANS_CONFIG,
  ROUTE_TO_MODULE_MAP,
  RESOURCE_TO_LIMIT_MAP,
  RESOURCE_NAMES,
  MODULE_NAMES,
  FEATURE_NAMES,
  getPlanConfig,
  normalizePlanId,
  isModuleAvailable,
  isFeatureAvailable,
  getResourceLimit,
  checkResourceLimit,
  getAllLimitsWithUsage,
  calculateTrialStatus,
  getRecommendedUpgrade,
  getPlanPriceCents,
  isPaidPlan,
  generatePaymentReference,
};
