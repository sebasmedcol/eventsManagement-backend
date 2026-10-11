const cron = require('node-cron');
const { closeExpiredUsagePeriods } = require('../services/usageLimitService');

async function ejecutarCierrePeriodosUso() {
  const isDryRun = process.env.CRON_DRY_RUN === 'true';
  console.log(`[Cron CierrePeriodosUso] Iniciando${isDryRun ? ' (DRY_RUN)' : ''}...`);

  if (isDryRun) {
    console.log('[Cron CierrePeriodosUso] DRY_RUN activo — no se cerrarán períodos.');
    return { dryRun: true };
  }

  try {
    const result = await closeExpiredUsagePeriods();
    console.log('[Cron CierrePeriodosUso] Resultado:', result);
    return result;
  } catch (error) {
    console.error('[Cron CierrePeriodosUso] Error:', error.message);
    return { error: true, message: error.message };
  }
}

function registrarCierrePeriodosUso() {
  const tz = process.env.CRON_TZ || 'America/Bogota';
  cron.schedule('15 4 * * *', ejecutarCierrePeriodosUso, {
    timezone: tz,
    name: 'cierre-periodos-uso',
  });
  console.log(`[Cron] cierrePeriodosUso registrado — 04:15 AM ${tz}`);
}

module.exports = {
  ejecutarCierrePeriodosUso,
  registrarCierrePeriodosUso,
};
