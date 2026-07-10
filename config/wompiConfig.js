/**
 * Configuración central de Wompi por entorno.
 * @see PlanImplementacionPasarela.txt — sección 4
 */

const WOMPI_ENV_VALUES = ['sandbox', 'production'];

function resolveApiUrl(env) {
  return env === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';
}

const env = process.env.WOMPI_ENV || 'sandbox';
const nodeEnv = process.env.NODE_ENV || 'development';

const wompiConfig = {
  env,
  apiUrl: process.env.WOMPI_API_URL || resolveApiUrl(env),
  publicKey: process.env.WOMPI_PUBLIC_KEY || '',
  privateKey: process.env.WOMPI_PRIVATE_KEY || '',
  eventsSecret: process.env.WOMPI_EVENTS_SECRET || '',
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
  webhookUrl: process.env.WOMPI_WEBHOOK_URL || '',
  checkoutScript: 'https://checkout.wompi.co/widget.js',
  currency: 'COP',
  isSandbox: () => env === 'sandbox',
  isProduction: () => env === 'production',
  isConfigured: () => Boolean(process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_PRIVATE_KEY),
};

/**
 * Valida coherencia de llaves según NODE_ENV y WOMPI_ENV.
 * Lanza error en producción si se detectan llaves sandbox.
 */
function validateWompiConfig() {
  if (!WOMPI_ENV_VALUES.includes(env)) {
    throw new Error(`WOMPI_ENV inválido: "${env}". Use sandbox o production.`);
  }

  const publicKey = wompiConfig.publicKey;
  if (!publicKey) {
    console.warn('[Wompi] WOMPI_PUBLIC_KEY no configurada — módulo de pagos deshabilitado.');
    return;
  }

  const isTestKey = publicKey.startsWith('pub_test_');
  const isProdKey = publicKey.startsWith('pub_prod_');

  if (nodeEnv === 'production' && isTestKey) {
    throw new Error(
      '[Wompi] Llaves sandbox (pub_test_) detectadas con NODE_ENV=production. Abortando.'
    );
  }

  if (env === 'production' && isTestKey) {
    throw new Error(
      '[Wompi] WOMPI_ENV=production requiere llaves pub_prod_.'
    );
  }

  if (env === 'sandbox' && isProdKey) {
    console.warn('[Wompi] WOMPI_ENV=sandbox pero se usa llave pub_prod_. Verifique la configuración.');
  }

  if (!isTestKey && !isProdKey) {
    console.warn('[Wompi] Prefijo de llave pública no reconocido.');
  }

  if (wompiConfig.webhookUrl) {
    console.log(`[Wompi] Webhook configurado: ${wompiConfig.webhookUrl}`);
  } else if (process.env.NGROK_BASE_URL) {
    console.warn(
      `[Wompi] WOMPI_WEBHOOK_URL vacío. Sugerido: ${process.env.NGROK_BASE_URL}/api/webhooks/wompi`
    );
  }

  console.log(`[Wompi] Configurado — entorno API: ${env}, URL: ${wompiConfig.apiUrl}`);
}

module.exports = {
  wompiConfig,
  validateWompiConfig,
};
