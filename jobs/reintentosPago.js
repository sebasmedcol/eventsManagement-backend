/**
 * Job: reintentosPago.js
 * Cron: 07:00 AM America/Bogota — diario
 *
 * Reintenta cobros fallidos (estado: 'past_due') hasta 3 veces.
 * Espera al menos 3 días entre intentos.
 * Si se superan 3 intentos → estado 'expirada' + downgrade a free_trial.
 */

const cron = require('node-cron');
const Suscripcion = require('../models/suscripcionModel');
const Empresa = require('../models/empresaModel');
const PagoSuscripcion = require('../models/pagoSuscripcionModel');
const { procesarCobroMensual } = require('../services/suscripcionService');

const DIAS_ENTRE_REINTENTOS = 3;
const MAX_INTENTOS = 3;

async function ejecutarReintentosPago() {
  const isDryRun = process.env.CRON_DRY_RUN === 'true';
  console.log(`[Cron ReintentosPago] Iniciando${isDryRun ? ' (DRY_RUN)' : ''}...`);

  let suscripciones;
  try {
    suscripciones = await Suscripcion.find({
      estado: 'past_due',
      autoRenovacion: true,
      intentosCobroFallidos: { $lt: MAX_INTENTOS },
      wompiPaymentSourceId: { $exists: true, $ne: null },
    });
  } catch (err) {
    console.error('[Cron ReintentosPago] Error al consultar suscripciones:', err.message);
    return;
  }

  console.log(`[Cron ReintentosPago] ${suscripciones.length} suscripción(es) past_due encontradas.`);

  const resultados = { reintentado: 0, dryRun: 0, esperando: 0, expirada: 0, error: 0 };

  for (const suscripcion of suscripciones) {
    try {
      // Verificar si ya se superaron los intentos máximos
      if ((suscripcion.intentosCobroFallidos || 0) >= MAX_INTENTOS) {
        await Suscripcion.findByIdAndUpdate(suscripcion._id, { estado: 'expirada' });
        await Empresa.findByIdAndUpdate(suscripcion.empresa, {
          estadoSuscripcion: 'expirada',
          plan: 'free_trial',
        });
        console.log(`[Cron ReintentosPago] Empresa ${suscripcion.empresa} → EXPIRADA (${MAX_INTENTOS} intentos fallidos).`);
        resultados.expirada++;
        continue;
      }

      // Verificar que hayan pasado al menos DIAS_ENTRE_REINTENTOS días desde el último intento
      const ultimoPago = await PagoSuscripcion.findOne({
        empresa: suscripcion.empresa,
        tipo: { $in: ['renovacion', 'reintento'] },
        estado: { $in: ['DECLINED', 'ERROR', 'VOIDED'] },
      }).sort({ createdAt: -1 });

      if (ultimoPago) {
        const diasDesdeUltimoIntento = Math.floor(
          (Date.now() - new Date(ultimoPago.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diasDesdeUltimoIntento < DIAS_ENTRE_REINTENTOS) {
          console.log(
            `[Cron ReintentosPago] Empresa ${suscripcion.empresa}: último intento hace ${diasDesdeUltimoIntento} días — esperando ${DIAS_ENTRE_REINTENTOS - diasDesdeUltimoIntento} días más.`
          );
          resultados.esperando++;
          continue;
        }
      }

      if (isDryRun) {
        console.log(`[Cron ReintentosPago DRY_RUN] Habría reintentado cobro empresa ${suscripcion.empresa}.`);
        resultados.dryRun++;
        continue;
      }

      // Cambiar tipo a 'reintento' para que el webhook lo procese correctamente
      // El job llama a procesarCobroMensual que crea un PagoSuscripcion tipo 'renovacion'
      // Aquí marcamos el tipo después para distinguirlo en el historial
      const resultado = await procesarCobroMensual(suscripcion);

      // Si se creó el PagoSuscripcion, actualizar tipo a 'reintento'
      if (resultado.reference) {
        await PagoSuscripcion.findOneAndUpdate(
          { wompiReference: resultado.reference, empresa: suscripcion.empresa },
          { tipo: 'reintento' }
        );
      }

      if (resultado.error) resultados.error++;
      else if (resultado.skipped) resultados.esperando++;
      else resultados.reintentado++;
    } catch (err) {
      console.error(`[Cron ReintentosPago] Error empresa ${suscripcion.empresa}:`, err.message);
      resultados.error++;
    }
  }

  console.log('[Cron ReintentosPago] Resultado:', resultados);
}

function registrarReintentosPago() {
  const tz = process.env.CRON_TZ || 'America/Bogota';
  cron.schedule('0 7 * * *', ejecutarReintentosPago, {
    timezone: tz,
    name: 'reintentos-pago',
  });
  console.log(`[Cron] reintentosPago registrado — 07:00 AM ${tz}`);
}

module.exports = { registrarReintentosPago, ejecutarReintentosPago };
