/**
 * jobs/index.js
 * Registra todos los cron jobs si ENABLE_CRON_JOBS=true.
 * Llamado desde server.js después de conectar MongoDB.
 */

const { registrarCobrosMensuales } = require('./cobrosMensuales');
const { registrarReintentosPago } = require('./reintentosPago');
const { registrarRecordatoriosPago } = require('./recordatoriosPago');
const { registrarConciliacionPagos } = require('./conciliacionPagos');

function initJobs() {
  const enabled = process.env.ENABLE_CRON_JOBS === 'true';

  if (!enabled) {
    console.log('[Jobs] ENABLE_CRON_JOBS=false — cron jobs desactivados.');
    return;
  }

  console.log('[Jobs] Iniciando cron jobs...');
  registrarConciliacionPagos();
  registrarCobrosMensuales();
  registrarReintentosPago();
  registrarRecordatoriosPago();
  console.log('[Jobs] Todos los cron jobs registrados.');
}

module.exports = { initJobs };
