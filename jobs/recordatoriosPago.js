/**
 * Job: recordatoriosPago.js
 * Cron: 08:00 AM America/Bogota — diario
 *
 * Busca suscripciones que requieran recordatorio (trial por expirar,
 * pagos próximos, pagos fallidos) y envía un correo electrónico.
 * Usa RecordatorioModel para idempotencia.
 */

const cron = require('node-cron');
const Suscripcion = require('../models/suscripcionModel');
const Empresa = require('../models/empresaModel');
const Recordatorio = require('../models/recordatorioModel');
const { getPlanConfig, normalizePlanId } = require('../config/plansConfig');
const { sendEmail } = require('../services/emailService');

async function enviarRecordatorioSiNoExiste({ empresa, tipo, referenciaId, data, templateName }) {
  const isDryRun = process.env.CRON_DRY_RUN === 'true';

  // Verificar plan.caracteristicas.notificacionesEmail
  const planId = normalizePlanId(empresa.plan);
  const planConfig = getPlanConfig(planId);
  if (!planConfig.caracteristicas.notificacionesEmail) {
    if (isDryRun) {
      console.log(`[Recordatorio DRY_RUN] Omitiendo email (${tipo}) a ${empresa._id} porque el plan no incluye notificacionesEmail.`);
    }
    return;
  }

  // Idempotencia
  const existente = await Recordatorio.findOne({ referenciaId, empresa: empresa._id });
  if (existente) return; // Ya se envió este aviso

  if (isDryRun) {
    console.log(`[Recordatorio DRY_RUN] Habría enviado email de tipo '${tipo}' a empresa ${empresa._id}. Referencia: ${referenciaId}`);
    return;
  }

  // Enviar
  const enviado = await sendEmail({
    to: empresa.email,
    templateName,
    data,
  });

  if (enviado) {
    await Recordatorio.create({
      empresa: empresa._id,
      tipo,
      destinatario: empresa.email,
      referenciaId,
    });
  }
}

async function procesarRecordatoriosTrials() {
  const empresas = await Empresa.find({ plan: 'free_trial' });

  for (const empresa of empresas) {
    if (!empresa.fechaCreacion) continue;
    const planConfig = getPlanConfig('free_trial');
    const duracion = planConfig.duracionDias || 7;

    const fechaCreacion = new Date(empresa.fechaCreacion);
    const fechaExpiracion = new Date(fechaCreacion);
    fechaExpiracion.setDate(fechaExpiracion.getDate() + duracion);

    const msRestantes = fechaExpiracion.getTime() - Date.now();
    const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

    const refBase = `TRIAL-${empresa._id}-${fechaExpiracion.toISOString().split('T')[0]}`;
    
    let tipo = null;
    let templateName = null;
    let data = { diasRestantes };

    if (diasRestantes === 3) {
      tipo = 'trial_3_dias';
      templateName = 'trial_expirando';
    } else if (diasRestantes === 1) {
      tipo = 'trial_1_dia';
      templateName = 'trial_expirando';
    } else if (diasRestantes === 0) {
      tipo = 'trial_expirado';
      templateName = 'trial_expirado';
    }

    if (tipo) {
      await enviarRecordatorioSiNoExiste({
        empresa,
        tipo,
        referenciaId: `${refBase}-${tipo}`,
        data,
        templateName,
      });
    }
  }
}

async function procesarRecordatoriosCobros() {
  // Proximos cobros (estado activa)
  const suscripcionesActivas = await Suscripcion.find({ estado: 'activa', autoRenovacion: true }).populate('empresa');
  for (const suscripcion of suscripcionesActivas) {
    if (!suscripcion.fechaProximoCobro || !suscripcion.empresa) continue;

    const empresa = suscripcion.empresa;
    const msRestantes = new Date(suscripcion.fechaProximoCobro).getTime() - Date.now();
    const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

    const refBase = `COBRO-${empresa._id}-${new Date(suscripcion.fechaProximoCobro).toISOString().split('T')[0]}`;
    
    let tipo = null;
    if (diasRestantes === 7) tipo = 'cobro_7_dias';
    else if (diasRestantes === 3) tipo = 'cobro_3_dias';
    else if (diasRestantes === 1) tipo = 'cobro_1_dia';

    if (tipo) {
      const planConfig = getPlanConfig(suscripcion.planId);
      await enviarRecordatorioSiNoExiste({
        empresa,
        tipo,
        referenciaId: `${refBase}-${tipo}`,
        templateName: 'proximo_cobro',
        data: {
          dias: diasRestantes,
          nombrePlan: planConfig.nombre,
          fechaCobro: new Date(suscripcion.fechaProximoCobro).toLocaleDateString(),
          monto: suscripcion.montoMensualCents / 100
        },
      });
    }
  }

  // Cobros fallidos (estado past_due)
  const suscripcionesPastDue = await Suscripcion.find({ estado: 'past_due' }).populate('empresa');
  for (const suscripcion of suscripcionesPastDue) {
    if (!suscripcion.fechaProximoCobro || !suscripcion.empresa) continue;
    
    const empresa = suscripcion.empresa;
    const msMora = Date.now() - new Date(suscripcion.fechaProximoCobro).getTime();
    const diasMora = Math.floor(msMora / (1000 * 60 * 60 * 24));

    const refBase = `MORA-${empresa._id}-${new Date(suscripcion.fechaProximoCobro).toISOString().split('T')[0]}`;
    
    let tipo = null;
    if (diasMora === 1) tipo = 'cobro_fallido_1';
    else if (diasMora === 3) tipo = 'cobro_fallido_3';
    else if (diasMora === 7) tipo = 'cobro_fallido_7';

    if (tipo) {
      const planConfig = getPlanConfig(suscripcion.planId);
      await enviarRecordatorioSiNoExiste({
        empresa,
        tipo,
        referenciaId: `${refBase}-${tipo}`,
        templateName: 'pago_fallido',
        data: {
          nombrePlan: planConfig.nombre,
          monto: suscripcion.montoMensualCents / 100
        },
      });
    }
  }
}

async function ejecutarRecordatoriosPago() {
  console.log('[Cron Recordatorios] Iniciando revisión...');
  try {
    await procesarRecordatoriosTrials();
    await procesarRecordatoriosCobros();
  } catch (error) {
    console.error('[Cron Recordatorios] Error procesando envíos:', error.message);
  }
  console.log('[Cron Recordatorios] Finalizado.');
}

function registrarRecordatoriosPago() {
  const tz = process.env.CRON_TZ || 'America/Bogota';
  cron.schedule('0 8 * * *', ejecutarRecordatoriosPago, {
    timezone: tz,
    name: 'recordatorios-pago',
  });
  console.log(`[Cron] recordatoriosPago registrado — 08:00 AM ${tz}`);
}

module.exports = { registrarRecordatoriosPago, ejecutarRecordatoriosPago };
