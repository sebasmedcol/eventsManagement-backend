/**
 * Configuración central de planes de suscripción para NextEvents
 * Define límites, módulos disponibles y características por plan
 * 
 * ESPECIFICACIÓN DE PLANES:
 * - FREE TRIAL: 7 días gratis, acceso completo con límites, solo lectura al expirar
 * - BÁSICO: $29.99/mes - Pequeños negocios
 * - PRO: $79.99/mes - Empresas en crecimiento
 * - PREMIUM: $199.99/mes - Sin límites
 */

const PLANS_CONFIG = {
  // Plan de prueba gratuita (7 días)
  free_trial: {
    nombre: 'Prueba Gratuita',
    slogan: 'Conoce toda la plataforma',
    descripcion: 'Acceso completo por 7 días para evaluar la plataforma',
    duracionDias: 7,
    precio: 0,
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
      eventosPremium: false,
      cotizaciones: true,
      calendario: true,
      facturacion: true,
      consecutivos: true,
      reportes: false,
      reportesAvanzados: false,
      usuarios: true,
      roles: false,
      configuracion: true,
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
      exportarPDF: false,
      notificacionesEmail: false,
      notificacionesSMS: false,
      personalizacionMarca: false,
      soportePrioritario: false,
      capacitacion: false,
      brandingPersonalizado: false,
      automatizacionWhatsApp: false,
      herramientasIA: false,
    },
    // Regla especial: al expirar, el usuario puede ver pero no crear
    restriccionAlExpirar: 'lectura_solo',
  },

  // Plan Básico
  basico: {
    nombre: 'Básico',
    slogan: 'Organiza tu operación diaria',
    descripcion: 'Ideal para pequeños negocios de eventos, DJs, decoradores',
    precio: 29.99,
    perfilCliente: 'Pequeños negocios, DJs, decoradores, operadores pequeños',
    limites: {
      clientes: 100,
      productos: 50,
      ventas: 50,       // mensuales
      eventos: 3,       // mensuales
      cotizaciones: 50, // mensuales
      usuarios: 2,      // administradores
      consecutivos: 3,
      facturas: 50,
    },
    modulos: {
      dashboard: true,
      clientes: true,
      productos: true,
      servicios: true,
      ventas: true,
      eventos: true,      // eventos básicos
      eventosPremium: false, // NO tiene eventos premium completos
      cotizaciones: true,
      calendario: true,
      facturacion: true,
      consecutivos: true,
      reportes: true,
      reportesAvanzados: false,
      usuarios: true,     // usuarios y roles básicos
      roles: false,       // sin roles personalizados
      configuracion: true,
      integraciones: false,
      api: false,
      backups: false,
      auditoria: false,
      logisticaAvanzada: false,      // Bloqueado
      seguimientoTareas: false,       // Bloqueado
      estadisticasAvanzadas: false,   // Bloqueado
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
    precio: 79.99,
    perfilCliente: 'Empresas con flujo constante, operadores medianos, agencias',
    limites: {
      clientes: 500,
      productos: 300,
      ventas: 300,        // mensuales
      eventos: 10,        // mensuales
      cotizaciones: 300,  // mensuales
      usuarios: 5,        // administradores
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
      eventosPremium: true,     // Eventos Premium completos
      cotizaciones: true,
      calendario: true,
      facturacion: true,
      consecutivos: true,
      reportes: true,
      reportesAvanzados: true,  // Dashboard avanzado
      usuarios: true,
      roles: true,              // Roles personalizados RBAC
      configuracion: true,
      integraciones: true,
      api: false,
      backups: true,
      auditoria: true,          // Historial detallado
      logisticaAvanzada: true,  // Ficha logística avanzada
      seguimientoTareas: true,  // Seguimiento operativo de eventos
      estadisticasAvanzadas: true, // Estadísticas y métricas
    },
    caracteristicas: {
      exportarExcel: true,
      exportarPDF: true,        // Exportaciones PDF/Excel
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
    precio: 199.99,
    perfilCliente: 'Empresas grandes, operadores con alto volumen, agencias múltiples',
    limites: {
      clientes: -1,       // -1 significa ilimitado
      productos: -1,
      ventas: -1,
      eventos: -1,
      cotizaciones: -1,
      usuarios: 10,       // 10 usuarios admin o ilimitados según estrategia
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
      soportePrioritario: true,     // Prioridad de soporte
      capacitacion: true,
      brandingPersonalizado: true,  // Branding personalizado
      automatizacionWhatsApp: true, // Función futura
      herramientasIA: true,         // Funciones futuras de IA
      backupsAutomaticos: true,     // Copias de seguridad automáticas
      accesoAnticipado: true,       // Acceso anticipado a nuevas funciones
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

// Mapeo de recursos a su límite correspondiente
const RESOURCE_TO_LIMIT_MAP = {
  cliente: 'clientes',
  producto: 'productos',
  servicio: 'productos',  // servicios usan límite de productos
  venta: 'ventas',
  evento: 'eventos',
  cotizacion: 'cotizaciones',
  usuario: 'usuarios',
  consecutivo: 'consecutivos',
  factura: 'facturas',
};

// Nombres legibles de recursos en español
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

// Nombres legibles de módulos en español
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

// Nombres legibles de características en español
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

/**
 * Obtiene la configuración de un plan específico
 * @param {string} planId - ID del plan (free_trial, basico, pro, premium)
 * @returns {Object} Configuración del plan
 */
function getPlanConfig(planId) {
  const normalizedPlanId = normalizePlanId(planId);
  return PLANS_CONFIG[normalizedPlanId] || PLANS_CONFIG.free_trial;
}

/**
 * Normaliza el ID del plan para coincidir con las claves de PLANS_CONFIG
 * @param {string} planId - ID del plan en cualquier formato
 * @returns {string} ID normalizado
 */
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
    'super': 'premium',
  };
  
  return planMap[planId.toLowerCase()] || 'free_trial';
}

/**
 * Verifica si un módulo está disponible para un plan
 * @param {string} planId - ID del plan
 * @param {string} moduleName - Nombre del módulo
 * @returns {boolean}
 */
function isModuleAvailable(planId, moduleName) {
  const plan = getPlanConfig(planId);
  return plan.modulos[moduleName] === true;
}

/**
 * Verifica si una característica está disponible para un plan
 * @param {string} planId - ID del plan
 * @param {string} featureName - Nombre de la característica
 * @returns {boolean}
 */
function isFeatureAvailable(planId, featureName) {
  const plan = getPlanConfig(planId);
  return plan.caracteristicas[featureName] === true;
}

/**
 * Obtiene el límite de un recurso para un plan
 * @param {string} planId - ID del plan
 * @param {string} resourceType - Tipo de recurso
 * @returns {number} Límite (-1 si es ilimitado)
 */
function getResourceLimit(planId, resourceType) {
  const plan = getPlanConfig(planId);
  const limitKey = RESOURCE_TO_LIMIT_MAP[resourceType] || resourceType;
  return plan.limites[limitKey] ?? 0;
}

/**
 * Verifica si se puede crear un nuevo recurso dado el uso actual
 * @param {string} planId - ID del plan
 * @param {string} resourceType - Tipo de recurso
 * @param {number} currentCount - Cantidad actual del recurso
 * @returns {Object} { allowed: boolean, limit: number, current: number, message: string }
 */
function checkResourceLimit(planId, resourceType, currentCount) {
  const limit = getResourceLimit(planId, resourceType);
  const resourceName = RESOURCE_NAMES[RESOURCE_TO_LIMIT_MAP[resourceType] || resourceType] || resourceType;
  
  // -1 significa ilimitado
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      current: currentCount,
      unlimited: true,
      message: null,
    };
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

/**
 * Obtiene todos los límites y su uso para una empresa
 * @param {string} planId - ID del plan
 * @param {Object} usage - Objeto con el uso actual de cada recurso
 * @returns {Object} Información completa de límites y uso
 */
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

/**
 * Calcula los días restantes de un período de prueba
 * @param {Date} fechaInicio - Fecha de inicio del trial
 * @param {number} duracionDias - Duración del trial en días
 * @returns {Object} { diasRestantes, expirado, fechaExpiracion }
 */
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

/**
 * Obtiene el plan recomendado para actualizar basado en el uso actual
 * @param {string} currentPlanId - Plan actual
 * @param {Object} usage - Uso actual de recursos
 * @returns {string|null} ID del plan recomendado o null si ya tiene el máximo
 */
function getRecommendedUpgrade(currentPlanId, usage = {}) {
  const planOrder = ['free_trial', 'basico', 'pro', 'premium'];
  const currentIndex = planOrder.indexOf(normalizePlanId(currentPlanId));
  
  if (currentIndex === planOrder.length - 1) {
    return null; // Ya tiene el plan máximo
  }
  
  // Verificar si algún límite está cerca del máximo (>80%)
  const currentPlan = getPlanConfig(currentPlanId);
  let needsUpgrade = false;
  
  Object.keys(usage).forEach(resource => {
    const limit = currentPlan.limites[resource];
    if (limit !== -1 && limit > 0 && usage[resource] >= limit * 0.8) {
      needsUpgrade = true;
    }
  });
  
  if (needsUpgrade) {
    return planOrder[currentIndex + 1];
  }
  
  return null;
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
};
