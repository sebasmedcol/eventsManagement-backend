const {
  getAcceptanceTokens,
  getTransactionPublic,
  extractThreeDSAuth,
} = require('../services/wompiService');
const { wompiConfig } = require('../config/wompiConfig');
const {
  getEmpresaId,
  iniciarCheckout,
  crearPagoCon3DS,
  activarSuscripcionPorPago,
  marcarPagoFallido,
  crearFuentePagoRenovable,
  consultarEstadoFuentePago,
} = require('../services/suscripcionService');
const { normalizePlanId, getPlanConfig, getPlanPriceCents } = require('../config/plansConfig');
const PagoSuscripcion = require('../models/pagoSuscripcionModel');
const Suscripcion = require('../models/suscripcionModel');
const Empresa = require('../models/empresaModel');
const { sendEmail } = require('../services/emailService');

const requireBillingAdmin = (req, res, next) => {
  if (req.user?.isEmpresaSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'La cuenta SuperAdmin no requiere suscripción de pago.',
    });
  }
  const canPay =
    req.user?.esAdminPrincipal === true ||
    req.user?.rol === 'admin' ||
    req.user?.rol === 'superadmin';
  if (!canPay) {
    return res.status(403).json({
      success: false,
      message: 'Solo el administrador principal puede gestionar la suscripción.',
    });
  }
  next();
};

/**
 * GET /api/subscriptions/acceptance-tokens
 */
const getAcceptanceTokensHandler = async (req, res) => {
  try {
    const tokens = await getAcceptanceTokens();
    res.json({ success: true, data: tokens });
  } catch (error) {
    console.error('[Subscriptions] acceptance-tokens:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'No se pudieron obtener los tokens de aceptación.',
      code: error.code,
    });
  }
};

/**
 * POST /api/subscriptions/checkout
 * Body: { planId }
 */
const checkoutHandler = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId es requerido.' });
    }

    const empresaId = getEmpresaId(req.user);
    const checkout = await iniciarCheckout(empresaId, planId);

    res.json({
      success: true,
      data: {
        ...checkout,
        publicKey: wompiConfig.publicKey,
        wompiEnv: wompiConfig.env,
        isSandbox: wompiConfig.isSandbox(),
      },
    });
  } catch (error) {
    console.error('[Subscriptions] checkout:', error.message);
    const status = error.code === 'INVALID_PLAN' ? 400 : 500;
    res.status(status).json({
      success: false,
      message: error.message,
      code: error.code,
      wompiResponse: error.wompiResponse,
    });
  }
};

/**
 * POST /api/subscriptions/pay-with-3ds
 */
const payWith3DSHandler = async (req, res) => {
  try {
    const {
      planId,
      reference,
      cardToken,
      acceptanceToken,
      acceptPersonalAuth,
      fullName,
      phoneNumber,
      browserInfo,
      threeDsAuthType,
    } = req.body;

    if (!planId || !reference || !cardToken || !acceptanceToken || !acceptPersonalAuth) {
      return res.status(400).json({
        success: false,
        message:
          'Faltan campos: planId, reference, cardToken, acceptanceToken, acceptPersonalAuth.',
      });
    }

    if (!browserInfo) {
      return res.status(400).json({
        success: false,
        message: 'browserInfo es obligatorio para 3D Secure.',
      });
    }

    const empresaId = getEmpresaId(req.user);
    const result = await crearPagoCon3DS({
      empresaId,
      planId,
      reference,
      cardToken,
      acceptanceToken,
      acceptPersonalAuth,
      customerData: {
        full_name: fullName || req.user?.nombreUsuario || 'Cliente NextEvents',
        phone_number: phoneNumber || '3000000000',
        browser_info: browserInfo,
      },
      threeDsAuthType: threeDsAuthType || (wompiConfig.isSandbox() ? 'challenge_v2' : null),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Subscriptions] pay-with-3ds:', error.message);
    if (error.wompiResponse) {
      console.error('[Subscriptions] Wompi response:', JSON.stringify(error.wompiResponse));
    }
    const status =
      error.code === 'CHECKOUT_NOT_FOUND' || error.code === 'INVALID_PLAN' ? 400 : 502;
    res.status(status).json({
      success: false,
      message: error.message,
      code: error.code,
      wompiResponse: error.wompiResponse,
    });
  }
};

/**
 * GET /api/subscriptions/transactions/:id/status
 */
const getTransactionStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = getEmpresaId(req.user);

    const pago = await PagoSuscripcion.findOne({
      wompiTransactionId: id,
      empresa: empresaId,
    });
    if (!pago) {
      return res.status(404).json({ success: false, message: 'Transacción no encontrada.' });
    }

    const transaction = await getTransactionPublic(id);
    const threeDsAuth = extractThreeDSAuth(transaction);

    if (transaction.status === 'APPROVED' && pago.estado !== 'APPROVED') {
      await activarSuscripcionPorPago({
        empresaId,
        planId: pago.planId,
        wompiTransactionId: id,
        wompiReference: transaction.reference,
        montoCents: transaction.amount_in_cents,
        respuestaWompi: transaction,
      });
    } else if (
      ['DECLINED', 'ERROR', 'VOIDED'].includes(transaction.status) &&
      pago.estado !== transaction.status
    ) {
      await marcarPagoFallido(id, transaction.status, transaction);
    }

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        reference: transaction.reference,
        threeDsAuth,
        paymentMethodExtra: transaction.payment_method?.extra || null,
        asyncPaymentUrl: transaction.payment_method?.extra?.async_payment_url || null,
      },
    });
  } catch (error) {
    console.error('[Subscriptions] transaction status:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al consultar la transacción.',
    });
  }
};

/**
 * GET /api/subscriptions/checkout-preview/:planId
 */
const checkoutPreviewHandler = async (req, res) => {
  try {
    const normalized = normalizePlanId(req.params.planId);
    const plan = getPlanConfig(normalized);
    res.json({
      success: true,
      data: {
        planId: normalized,
        nombre: plan.nombre,
        precioCents: getPlanPriceCents(normalized),
        precioFormatted: getPlanPriceCents(normalized) / 100,
        currency: 'COP',
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/subscriptions/payment-sources
 */
const createPaymentSourceHandler = async (req, res) => {
  try {
    const { cardToken, acceptanceToken, acceptPersonalAuth } = req.body;
    if (!cardToken || !acceptanceToken || !acceptPersonalAuth) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos: cardToken, acceptanceToken, acceptPersonalAuth.',
      });
    }

    const empresaId = getEmpresaId(req.user);
    const source = await crearFuentePagoRenovable({
      empresaId,
      cardToken,
      acceptanceToken,
      acceptPersonalAuth,
    });

    res.json({
      success: true,
      data: {
        paymentSourceId: source.id,
        status: source.status,
        publicData: source.public_data || null,
        threeDsAuth: source.extra?.three_ds_auth || null,
        extra: source.extra || null,
      },
    });
  } catch (error) {
    console.error('[Subscriptions] payment-source create:', error.message);
    const status =
      error.code === 'SUBSCRIPTION_NOT_READY' || error.code === 'EMPRESA_NOT_FOUND' ? 400 : 502;
    res.status(status).json({
      success: false,
      message: error.message,
      code: error.code,
      wompiResponse: error.wompiResponse,
    });
  }
};

/**
 * GET /api/subscriptions/payment-sources/:id/status
 */
const getPaymentSourceStatusHandler = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req.user);
    const source = await consultarEstadoFuentePago({
      empresaId,
      paymentSourceId: req.params.id,
    });

    res.json({
      success: true,
      data: {
        paymentSourceId: source.id,
        status: source.status,
        publicData: source.public_data || null,
        threeDsAuth: source.extra?.three_ds_auth || null,
        extra: source.extra || null,
      },
    });
  } catch (error) {
    console.error('[Subscriptions] payment-source status:', error.message);
    const status =
      error.code === 'PAYMENT_SOURCE_NOT_FOUND' || error.code === 'SUBSCRIPTION_NOT_FOUND'
        ? 404
        : 500;
    res.status(status).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }
};

/**
 * GET /api/subscriptions/payments
 */
const getPaymentHistoryHandler = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req.user);
    const payments = await PagoSuscripcion.find({ empresa: empresaId }).sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('[Subscriptions] payment history:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener el historial de pagos.' });
  }
};

/**
 * POST /api/subscriptions/cancel
 */
const cancelSubscriptionHandler = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req.user);
    const suscripcion = await Suscripcion.findOne({ empresa: empresaId });
    if (!suscripcion) {
      return res.status(404).json({ success: false, message: 'No hay suscripción activa.' });
    }

    suscripcion.autoRenovacion = false;
    await suscripcion.save();

    const empresa = await Empresa.findById(empresaId);
    if (empresa) {
      const planConfig = getPlanConfig(suscripcion.planId);
      const fechaFinStr = suscripcion.fechaProximoCobro 
        ? new Date(suscripcion.fechaProximoCobro).toLocaleDateString()
        : 'el final de tu ciclo';
        
      await sendEmail({
        to: empresa.email,
        templateName: 'suscripcion_cancelada',
        data: {
          nombrePlan: planConfig.nombre,
          fechaFin: fechaFinStr
        }
      });
    }

    res.json({ success: true, message: 'Renovación automática cancelada.' });
  } catch (error) {
    console.error('[Subscriptions] cancel:', error.message);
    res.status(500).json({ success: false, message: 'Error al cancelar la suscripción.' });
  }
};

/**
 * POST /api/subscriptions/reactivate
 */
const reactivateSubscriptionHandler = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req.user);
    const suscripcion = await Suscripcion.findOne({ empresa: empresaId });
    if (!suscripcion) {
      return res.status(404).json({ success: false, message: 'No hay suscripción activa.' });
    }

    if (suscripcion.estado === 'cancelada' || suscripcion.estado === 'expirada') {
      return res.status(400).json({ success: false, message: 'La suscripción ya expiró o fue cancelada, debes adquirir un plan nuevamente.' });
    }

    suscripcion.autoRenovacion = true;
    await suscripcion.save();

    res.json({ success: true, message: 'Renovación automática reactivada.' });
  } catch (error) {
    console.error('[Subscriptions] reactivate:', error.message);
    res.status(500).json({ success: false, message: 'Error al reactivar la suscripción.' });
  }
};

module.exports = {
  requireBillingAdmin,
  getAcceptanceTokensHandler,
  checkoutHandler,
  payWith3DSHandler,
  getTransactionStatusHandler,
  checkoutPreviewHandler,
  createPaymentSourceHandler,
  getPaymentSourceStatusHandler,
  getPaymentHistoryHandler,
  cancelSubscriptionHandler,
  reactivateSubscriptionHandler,
};
