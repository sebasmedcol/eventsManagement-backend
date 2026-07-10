const { verifyWebhookSignature } = require('../services/wompiService');
const { procesarWebhookTransaccion } = require('../services/suscripcionService');

/**
 * POST /api/webhooks/wompi
 * Wompi envía eventos transaction.updated, etc.
 */
const wompiWebhookHandler = async (req, res) => {
  try {
    const event = req.body;

    if (!event?.event || !event?.data) {
      console.warn('[Webhook Wompi] Payload inválido');
      return res.status(200).send('OK');
    }

    const signatureValid = verifyWebhookSignature(event);
    if (!signatureValid) {
      console.warn('[Webhook Wompi] Firma inválida — evento ignorado:', event.event);
      return res.status(200).send('OK');
    }

    if (event.event === 'transaction.updated') {
      const transaction = event.data?.transaction;
      const result = await procesarWebhookTransaccion(transaction);
      console.log('[Webhook Wompi] transaction.updated:', result);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook Wompi] Error:', error.message);
    return res.status(200).send('OK');
  }
};

module.exports = { wompiWebhookHandler };
