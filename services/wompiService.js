/**
 * Servicio de integración con API Wompi.
 * @see NextEventPasarela/USO DEl API.txt
 * @see NextEventPasarela/AMBIENTES Y LLAVES Contexto General.txt
 */

const crypto = require('crypto');
const axios = require('axios');
const { wompiConfig } = require('../config/wompiConfig');

function assertConfigured() {
  if (!wompiConfig.isConfigured()) {
    const err = new Error('Wompi no está configurado. Revise las variables de entorno.');
    err.code = 'WOMPI_NOT_CONFIGURED';
    throw err;
  }
}

function wompiClient(usePrivateKey = false) {
  assertConfigured();
  const key = usePrivateKey ? wompiConfig.privateKey : wompiConfig.publicKey;
  return axios.create({
    baseURL: wompiConfig.apiUrl,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

/**
 * GET /v1/merchants/{public_key}
 * Retorna tokens de aceptación para política de privacidad y datos personales.
 */
async function getAcceptanceTokens() {
  const client = wompiClient(false);
  const { data } = await client.get(`/merchants/${wompiConfig.publicKey}`);

  const merchant = data?.data;
  if (!merchant) {
    throw new Error('Respuesta inválida al obtener tokens de aceptación Wompi.');
  }

  return {
    acceptance_token: merchant.presigned_acceptance?.acceptance_token,
    acceptance_permalink: merchant.presigned_acceptance?.permalink,
    accept_personal_auth: merchant.presigned_personal_data_auth?.acceptance_token,
    personal_auth_permalink: merchant.presigned_personal_data_auth?.permalink,
  };
}

/**
 * Firma de integridad para transacciones.
 * SHA256("<reference><amount_in_cents>COP[<expiration>]<integrity_secret>")
 */
function generateIntegritySignature(reference, amountInCents, expirationTime = null) {
  if (!wompiConfig.integritySecret) {
    throw new Error('WOMPI_INTEGRITY_SECRET no configurado.');
  }

  let payload = `${reference}${amountInCents}${wompiConfig.currency}`;
  if (expirationTime) {
    payload += expirationTime;
  }
  payload += wompiConfig.integritySecret;

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Valida checksum de evento webhook Wompi.
 * @param {object} event - Cuerpo completo del evento
 * @returns {boolean}
 */
function verifyWebhookSignature(event) {
  if (!wompiConfig.eventsSecret) {
    console.warn('[Wompi] WOMPI_EVENTS_SECRET no configurado — webhook no validado.');
    return false;
  }

  const { signature, timestamp, data } = event;
  if (!signature?.properties || !signature?.checksum || timestamp == null) {
    return false;
  }

  const values = signature.properties.map((prop) => {
    const parts = prop.split('.');
    let current = data;
    for (const part of parts) {
      current = current?.[part];
    }
    return current ?? '';
  });

  const payload = values.join('') + String(timestamp) + wompiConfig.eventsSecret;
  const calculated = crypto.createHash('sha256').update(payload).digest('hex').toUpperCase();
  const received = String(signature.checksum).toUpperCase();

  return calculated === received;
}

/**
 * GET /v1/payment_sources/{id}
 */
async function getPaymentSource(paymentSourceId) {
  const client = wompiClient(false);
  const { data } = await client.get(`/payment_sources/${paymentSourceId}`);
  return data?.data;
}

/**
 * POST /v1/payment_sources - creación de fuente de pago segura para recurrencia.
 * La documentación recomienda ejecutarlo desde el servidor.
 */
async function createPaymentSource({
  token,
  customerEmail,
  acceptanceToken,
  acceptPersonalAuth,
  type = 'CARD',
}) {
  const client = wompiClient(true);
  const body = {
    type,
    token,
    customer_email: customerEmail,
    acceptance_token: acceptanceToken,
    accept_personal_auth: acceptPersonalAuth,
  };

  const { data } = await client.post('/payment_sources', body);
  return data?.data;
}

/**
 * POST /v1/transactions — cobro con fuente de pago (llave privada, solo backend).
 */
async function createRecurringTransaction({
  amountInCents,
  reference,
  customerEmail,
  paymentSourceId,
  signature,
  installments = 1,
}) {
  const client = wompiClient(true);
  const body = {
    amount_in_cents: amountInCents,
    currency: wompiConfig.currency,
    customer_email: customerEmail,
    reference,
    payment_source_id: paymentSourceId,
    recurrent: true,
    signature,
    payment_method: {
      installments,
    },
  };

  const { data } = await client.post('/transactions', body);
  return data?.data;
}

/**
 * GET /v1/transactions/{id} — consulta pública (polling 3DS desde backend).
 */
async function getTransactionPublic(transactionId) {
  const client = wompiClient(false);
  const { data } = await client.get(`/transactions/${transactionId}`);
  return data?.data;
}

/**
 * POST /v1/transactions con 3D Secure (primer pago suscripción).
 * @see NextEventPasarela/Transacciones con 3D Secure (SandboX)V2.txt
 */
async function createThreeDSTransaction({
  amountInCents,
  reference,
  customerEmail,
  cardToken,
  signature,
  acceptanceToken,
  acceptPersonalAuth,
  customerData,
  threeDsAuthType = null,
}) {
  const client = wompiClient(true);
  const body = {
    acceptance_token: acceptanceToken,
    accept_personal_auth: acceptPersonalAuth,
    amount_in_cents: amountInCents,
    currency: wompiConfig.currency,
    customer_email: customerEmail,
    reference,
    signature,
    payment_method: {
      type: 'CARD',
      token: cardToken,
      installments: 1,
    },
    is_three_ds: true,
    customer_data: customerData,
  };

  if (wompiConfig.isSandbox() && threeDsAuthType) {
    body.three_ds_auth_type = threeDsAuthType;
  }

  const { data } = await client.post('/transactions', body);
  return data?.data;
}

/**
 * Extrae datos 3DS de una transacción para el frontend.
 */
function extractThreeDSAuth(transaction) {
  const extra = transaction?.payment_method?.extra;
  return extra?.three_ds_auth || null;
}

/**
 * GET /v1/transactions/{id}
 */
async function getTransaction(transactionId) {
  const client = wompiClient(true);
  const { data } = await client.get(`/transactions/${transactionId}`);
  return data?.data;
}

/**
 * Polling hasta estado final de transacción.
 */
async function pollTransactionStatus(transactionId, { intervalMs = 2000, timeoutMs = 120000 } = {}) {
  const start = Date.now();
  const finalStatuses = ['APPROVED', 'DECLINED', 'VOIDED', 'ERROR'];

  while (Date.now() - start < timeoutMs) {
    const tx = await getTransaction(transactionId);
    if (tx && finalStatuses.includes(tx.status)) {
      return tx;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timeout esperando transacción Wompi ${transactionId}`);
}

module.exports = {
  getAcceptanceTokens,
  generateIntegritySignature,
  verifyWebhookSignature,
  createPaymentSource,
  getPaymentSource,
  createRecurringTransaction,
  createThreeDSTransaction,
  getTransaction,
  getTransactionPublic,
  extractThreeDSAuth,
  pollTransactionStatus,
};
