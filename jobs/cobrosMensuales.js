/**
 * Job: cobrosMensuales.js
 * Cron: 06:00 AM America/Bogota — diario
 *
 * Busca suscripciones activas con fechaProximoCobro <= hoy y las cobra
 * usando el payment_source_id guardado (protocolo 3RI / recurrent: true).
 *
 * Control de ejecución:
 *   ENABLE_CRON_JOBS=true  → cron registrado al arrancar el servidor
 *   CRON_DRY_RUN=true      → solo loguea, NO llama a Wompi
 */

const cron = require('node-cron');
const Suscripcion = require('../models/suscripcionModel');
const { procesarCobroMensual } = require('../services/suscripcionService');

async function ejecutarCobrosMensuales() {
  const isDryRun = process.env.CRON_DRY_RUN === 'true';
  console.log(`[Cron CobrosMensuales] Iniciando${isDryRun ? ' (DRY_RUN)' : ''}...`);

  const hoy = new Date();
  // Incluir el día completo (hasta las 23:59:59 de hoy)
  const finDelDia = new Date(hoy);
  finDelDia.setHours(23, 59, 59, 999);

  let suscripciones;
  try {
    suscripciones = await Suscripcion.find({
      estado: 'activa',
      autoRenovacion: true,
      fechaProximoCobro: { $lte: finDelDia },
      wompiPaymentSourceId: { $exists: true, $ne: null },
    });
  } catch (err) {
    console.error('[Cron CobrosMensuales] Error al consultar suscripciones:', err.message);
    return;
  }

  console.log(`[Cron CobrosMensuales] ${suscripciones.length} suscripción(es) a procesar.`);

  const resultados = { ok: 0, dryRun: 0, skipped: 0, error: 0 };

  for (const suscripcion of suscripciones) {
    try {
      const resultado = await procesarCobroMensual(suscripcion);
      if (resultado.dryRun) resultados.dryRun++;
      else if (resultado.skipped) resultados.skipped++;
      else if (resultado.error) resultados.error++;
      else resultados.ok++;
    } catch (err) {
      console.error(`[Cron CobrosMensuales] Error empresa ${suscripcion.empresa}:`, err.message);
      resultados.error++;
    }
  }

  console.log('[Cron CobrosMensuales] Resultado:', resultados);

  // Alerta si más del 10% fallaron
  const total = resultados.ok + resultados.error;
  if (total > 0 && resultados.error / total > 0.1) {
    console.warn(`[Cron CobrosMensuales] ⚠ ALERTA: ${resultados.error}/${total} cobros fallaron (>${10}%).`);
  }
}

function registrarCobrosMensuales() {
  const tz = process.env.CRON_TZ || 'America/Bogota';
  // Ejecutar a las 06:00 AM todos los días
  cron.schedule('0 6 * * *', ejecutarCobrosMensuales, {
    timezone: tz,
    name: 'cobros-mensuales',
  });
  console.log(`[Cron] cobrosMensuales registrado — 06:00 AM ${tz}`);
}

module.exports = { registrarCobrosMensuales, ejecutarCobrosMensuales };
