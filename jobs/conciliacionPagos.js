/**
 * Job: conciliacionPagos.js
 * Cron: 05:30 AM America/Bogota — diario
 *
 * Busca PagosSuscripcion en estado PENDING con más de 60 minutos de antigüedad
 * y los compara contra la API pública de Wompi para cerrar su estado en Mongo.
 *
 * Corre antes que cobrosMensuales (06:00) para limpiar transacciones colgadas
 * del día anterior antes de evaluar cobros automáticos nuevos.
 */

const cron = require('node-cron');
const { conciliarPagosPendientes } = require('../services/suscripcionService');

async function ejecutarConciliacionPagos(opts = {}) {
  const isDryRun = process.env.CRON_DRY_RUN === 'true';
  const minutosAtras =
    opts.minutosAtras != null ? Number(opts.minutosAtras) : 60;

  console.log(
    `[Cron ConciliacionPagos] Iniciando${isDryRun ? ' (DRY_RUN)' : ''} — transacciones pendientes con más de ${minutosAtras} minutos.`
  );

  let resumen;
  try {
    if (isDryRun) {
      resumen = { total: 0, skip: true, nota: 'DRY_RUN activado — conciliación no fue ejecutada.' };
      console.log(
        '[Cron ConciliacionPagos DRY_RUN] Para ejecutar la conciliación real, desactive CRON_DRY_RUN o llame al endpoint manual.'
      );
    } else {
      resumen = await conciliarPagosPendientes({ minutosAtras });
    }
  } catch (err) {
    console.error('[Cron ConciliacionPagos] Error durante ejecución:', err.message);
    resumen = { error: true, message: err.message };
  }

  return resumen;
}

function registrarConciliacionPagos() {
  const tz = process.env.CRON_TZ || 'America/Bogota';
  cron.schedule('30 5 * * *', () => ejecutarConciliacionPagos(), {
    timezone: tz,
    name: 'conciliacion-pagos',
  });
  console.log(`[Cron] conciliacionPagos registrado — 05:30 AM ${tz}`);
}

module.exports = { registrarConciliacionPagos, ejecutarConciliacionPagos };
