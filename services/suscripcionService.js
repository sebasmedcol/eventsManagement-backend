/**
 * Lógica de negocio — suscripciones SaaS + Wompi
 */

const Empresa = require('../models/empresaModel');
const Suscripcion = require('../models/suscripcionModel');
const PagoSuscripcion = require('../models/pagoSuscripcionModel');
const {
  getPlanConfig,
  normalizePlanId,
  getPlanPriceCents,
  isPaidPlan,
  generatePaymentReference,
} = require('../config/plansConfig');
const {
  generateIntegritySignature,
  createThreeDSTransaction,
  createPaymentSource,
  getPaymentSource,
} = require('./wompiService');

const PAID_PLANS = ['basico', 'pro', 'premium'];

function calcularFechaProximoCobro(desde = new Date()) {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + 30);
  return fecha;
}

function getEmpresaId(user) {
  return user?.empresaId || user?.empresa;
}

async function iniciarCheckout(empresaId, planId) {
  const normalized = normalizePlanId(planId);
  if (!PAID_PLANS.includes(normalized)) {
    const err = new Error('Plan no válido para checkout de pago.');
    err.code = 'INVALID_PLAN';
    throw err;
  }

  const empresa = await Empresa.findById(empresaId);
  if (!empresa) {
    const err = new Error('Empresa no encontrada.');
    err.code = 'EMPRESA_NOT_FOUND';
    throw err;
  }

  const plan = getPlanConfig(normalized);
  const amountInCents = getPlanPriceCents(normalized);
  const reference = generatePaymentReference(normalized, empresaId);

  let suscripcion = await Suscripcion.findOne({ empresa: empresaId });
  if (suscripcion) {
    suscripcion.planId = normalized;
    suscripcion.estado = 'pendiente_pago';
    suscripcion.montoMensualCents = amountInCents;
    await suscripcion.save();
  } else {
    suscripcion = await Suscripcion.create({
      empresa: empresaId,
      planId: normalized,
      estado: 'pendiente_pago',
      montoMensualCents: amountInCents,
    });
  }

  await Empresa.findByIdAndUpdate(empresaId, {
    estadoSuscripcion: 'pendiente_pago',
  });

  const signature = generateIntegritySignature(reference, amountInCents);

  return {
    suscripcionId: suscripcion._id,
    planId: normalized,
    planNombre: plan.nombre,
    reference,
    amountInCents,
    amountFormatted: amountInCents / 100,
    currency: 'COP',
    signature,
    customerEmail: empresa.email,
  };
}

async function crearPagoCon3DS({
  empresaId,
  planId,
  reference,
  cardToken,
  acceptanceToken,
  acceptPersonalAuth,
  customerData,
  threeDsAuthType,
}) {
  const normalized = normalizePlanId(planId);
  if (!PAID_PLANS.includes(normalized)) {
    const err = new Error('Plan no válido.');
    err.code = 'INVALID_PLAN';
    throw err;
  }

  const empresa = await Empresa.findById(empresaId);
  if (!empresa) {
    const err = new Error('Empresa no encontrada.');
    err.code = 'EMPRESA_NOT_FOUND';
    throw err;
  }

  const suscripcion = await Suscripcion.findOne({ empresa: empresaId, planId: normalized });
  if (!suscripcion || suscripcion.estado !== 'pendiente_pago') {
    const err = new Error('No hay checkout pendiente. Inicie el proceso desde /planes.');
    err.code = 'CHECKOUT_NOT_FOUND';
    throw err;
  }

  const amountInCents = suscripcion.montoMensualCents;
  const signature = generateIntegritySignature(reference, amountInCents);

  let transaction;
  try {
    transaction = await createThreeDSTransaction({
      amountInCents,
      reference,
      customerEmail: empresa.email,
      cardToken,
      signature,
      acceptanceToken,
      acceptPersonalAuth,
      customerData,
      threeDsAuthType,
    });
  } catch (error) {
    const wompiMsg =
      error.response?.data?.error?.messages?.join?.(' ') ||
      error.response?.data?.error?.reason ||
      error.message;
    const err = new Error(wompiMsg || 'Error al crear transacción Wompi.');
    err.code = 'WOMPI_TRANSACTION_ERROR';
    err.wompiResponse = error.response?.data;
    throw err;
  }

  const pagoExistente = await PagoSuscripcion.findOne({ wompiReference: reference });
  if (!pagoExistente) {
    await PagoSuscripcion.create({
      empresa: empresaId,
      suscripcion: suscripcion._id,
      planId: normalized,
      wompiTransactionId: transaction.id,
      wompiReference: reference,
      montoCents: amountInCents,
      estado: transaction.status || 'PENDING',
      tipo: 'primer_pago',
      metodoPago: 'CARD',
      respuestaWompi: transaction,
    });
  } else {
    pagoExistente.wompiTransactionId = transaction.id;
    pagoExistente.estado = transaction.status || 'PENDING';
    pagoExistente.respuestaWompi = transaction;
    await pagoExistente.save();
  }

  const threeDsAuth = transaction.payment_method?.extra?.three_ds_auth || null;

  return {
    transactionId: transaction.id,
    status: transaction.status,
    reference,
    threeDsAuth,
    paymentMethodExtra: transaction.payment_method?.extra || null,
  };
}

async function activarSuscripcionPorPago({
  empresaId,
  planId,
  wompiTransactionId,
  wompiReference,
  montoCents,
  respuestaWompi,
}) {
  const normalized = normalizePlanId(planId);
  const ahora = new Date();
  const proximoCobro = calcularFechaProximoCobro(ahora);
  const suscripcionActual = await Suscripcion.findOne({ empresa: empresaId });

  const lastFour =
    respuestaWompi?.payment_method?.extra?.last_four ||
    respuestaWompi?.payment_method?.extra?.lastFour ||
    null;
  const brand = respuestaWompi?.payment_method?.extra?.brand || null;

  await Suscripcion.findOneAndUpdate(
    { empresa: empresaId },
    {
      planId: normalized,
      estado: 'activa',
      fechaInicio: ahora,
      fechaProximoCobro: proximoCobro,
      fechaUltimoCobro: ahora,
      intentosCobroFallidos: 0,
      wompiPaymentSourceId: suscripcionActual?.wompiPaymentSourceId || null,
      autoRenovacion: Boolean(suscripcionActual?.wompiPaymentSourceId),
      metodoPago: {
        tipo: 'CARD',
        ultimos4: lastFour,
        marca: brand,
      },
    },
    { upsert: true, new: true }
  );

  await Empresa.findByIdAndUpdate(empresaId, {
    plan: normalized,
    estadoSuscripcion: 'activa',
    fechaInicioSuscripcion: ahora,
    fechaProximoCobro: proximoCobro,
    wompiCustomerEmail: respuestaWompi?.customer_email,
    wompiPaymentSourceId: suscripcionActual?.wompiPaymentSourceId || null,
    metodoPagoTipo: 'CARD',
    metodoPagoUltimos4: lastFour,
    autoRenovacion: Boolean(suscripcionActual?.wompiPaymentSourceId),
  });

  if (wompiTransactionId) {
    await PagoSuscripcion.findOneAndUpdate(
      { wompiTransactionId },
      {
        estado: 'APPROVED',
        fechaAprobacion: ahora,
        respuestaWompi,
      }
    );
  } else if (wompiReference) {
    await PagoSuscripcion.findOneAndUpdate(
      { wompiReference },
      {
        estado: 'APPROVED',
        fechaAprobacion: ahora,
        wompiTransactionId: respuestaWompi?.id,
        respuestaWompi,
      }
    );
  }
}

async function marcarPagoFallido(wompiTransactionId, estado, respuestaWompi) {
  const pago = await PagoSuscripcion.findOneAndUpdate(
    { wompiTransactionId },
    { estado, respuestaWompi },
    { new: true }
  );
  if (!pago) return null;

  if (pago.tipo === 'primer_pago') {
    await Empresa.findByIdAndUpdate(pago.empresa, { estadoSuscripcion: 'pendiente_pago' });
  }
  return pago;
}

async function vincularFuentePagoSegura({ empresaId, paymentSource }) {
  const sourceId = String(paymentSource.id);
  const publicData = paymentSource.public_data || {};
  const suscripcion = await Suscripcion.findOne({ empresa: empresaId });
  if (!suscripcion) {
    const err = new Error('Suscripción no encontrada para asociar la fuente de pago.');
    err.code = 'SUBSCRIPTION_NOT_FOUND';
    throw err;
  }

  suscripcion.wompiPaymentSourceId = sourceId;
  suscripcion.autoRenovacion = true;
  suscripcion.metodoPago = {
    tipo: paymentSource.type || 'CARD',
    ultimos4: publicData.last_four || suscripcion.metodoPago?.ultimos4 || null,
    marca: suscripcion.metodoPago?.marca || null,
    expiraEn:
      publicData.exp_month && publicData.exp_year
        ? `${publicData.exp_month}/${publicData.exp_year}`
        : suscripcion.metodoPago?.expiraEn || null,
  };
  suscripcion.metadata = {
    ...(suscripcion.metadata || {}),
    paymentSourceSetup: {
      id: sourceId,
      status: paymentSource.status,
      completedAt: new Date(),
    },
  };
  await suscripcion.save();

  await Empresa.findByIdAndUpdate(empresaId, {
    wompiPaymentSourceId: sourceId,
    wompiCustomerEmail: paymentSource.customer_email || undefined,
    metodoPagoTipo: paymentSource.type || 'CARD',
    metodoPagoUltimos4: publicData.last_four || undefined,
    autoRenovacion: true,
  });

  return suscripcion;
}

async function crearFuentePagoRenovable({
  empresaId,
  cardToken,
  acceptanceToken,
  acceptPersonalAuth,
}) {
  const empresa = await Empresa.findById(empresaId);
  if (!empresa) {
    const err = new Error('Empresa no encontrada.');
    err.code = 'EMPRESA_NOT_FOUND';
    throw err;
  }

  const suscripcion = await Suscripcion.findOne({ empresa: empresaId });
  if (!suscripcion || !isPaidPlan(suscripcion.planId)) {
    const err = new Error('No hay una suscripción paga válida para configurar auto-renovación.');
    err.code = 'SUBSCRIPTION_NOT_READY';
    throw err;
  }

  let paymentSource;
  try {
    paymentSource = await createPaymentSource({
      token: cardToken,
      customerEmail: empresa.email,
      acceptanceToken,
      acceptPersonalAuth,
      type: 'CARD',
    });
  } catch (error) {
    const wompiMsg =
      error.response?.data?.error?.messages?.join?.(' ') ||
      error.response?.data?.error?.reason ||
      error.message;
    const err = new Error(wompiMsg || 'Error al crear la fuente de pago Wompi.');
    err.code = 'WOMPI_PAYMENT_SOURCE_ERROR';
    err.wompiResponse = error.response?.data;
    throw err;
  }

  suscripcion.metadata = {
    ...(suscripcion.metadata || {}),
    paymentSourceSetup: {
      id: String(paymentSource.id),
      status: paymentSource.status,
      createdAt: new Date(),
    },
  };
  await suscripcion.save();

  if (paymentSource.status === 'AVAILABLE') {
    await vincularFuentePagoSegura({ empresaId, paymentSource });
  } else {
    await Empresa.findByIdAndUpdate(empresaId, { autoRenovacion: false });
  }

  return paymentSource;
}

async function consultarEstadoFuentePago({ empresaId, paymentSourceId }) {
  const suscripcion = await Suscripcion.findOne({ empresa: empresaId });
  if (!suscripcion) {
    const err = new Error('Suscripción no encontrada.');
    err.code = 'SUBSCRIPTION_NOT_FOUND';
    throw err;
  }

  const trackedIds = [
    suscripcion.wompiPaymentSourceId ? String(suscripcion.wompiPaymentSourceId) : null,
    suscripcion.metadata?.paymentSourceSetup?.id
      ? String(suscripcion.metadata.paymentSourceSetup.id)
      : null,
  ].filter(Boolean);

  if (!trackedIds.includes(String(paymentSourceId))) {
    const err = new Error('Fuente de pago no encontrada para esta empresa.');
    err.code = 'PAYMENT_SOURCE_NOT_FOUND';
    throw err;
  }

  const paymentSource = await getPaymentSource(paymentSourceId);
  suscripcion.metadata = {
    ...(suscripcion.metadata || {}),
    paymentSourceSetup: {
      ...(suscripcion.metadata?.paymentSourceSetup || {}),
      id: String(paymentSource.id),
      status: paymentSource.status,
      updatedAt: new Date(),
    },
  };

  if (paymentSource.status === 'AVAILABLE') {
    await suscripcion.save();
    await vincularFuentePagoSegura({ empresaId, paymentSource });
  } else {
    if (['DECLINED', 'ERROR'].includes(paymentSource.status)) {
      suscripcion.autoRenovacion = false;
      await Empresa.findByIdAndUpdate(empresaId, { autoRenovacion: false });
    }
    await suscripcion.save();
  }

  return paymentSource;
}

async function procesarWebhookTransaccion(transaction) {
  if (!transaction?.id || !transaction?.reference) {
    return { processed: false, reason: 'missing_data' };
  }

  const pago = await PagoSuscripcion.findOne({
    $or: [{ wompiTransactionId: transaction.id }, { wompiReference: transaction.reference }],
  });

  if (!pago) {
    return { processed: false, reason: 'pago_not_found', reference: transaction.reference };
  }

  if (pago.estado === 'APPROVED' && transaction.status === 'APPROVED') {
    return { processed: true, reason: 'already_approved', idempotent: true };
  }

  if (transaction.status === 'APPROVED') {
    await activarSuscripcionPorPago({
      empresaId: pago.empresa,
      planId: pago.planId,
      wompiTransactionId: transaction.id,
      wompiReference: transaction.reference,
      montoCents: transaction.amount_in_cents,
      respuestaWompi: transaction,
    });
    return { processed: true, reason: 'activated', status: 'APPROVED' };
  }

  if (['DECLINED', 'ERROR', 'VOIDED'].includes(transaction.status)) {
    await marcarPagoFallido(transaction.id, transaction.status, transaction);
    return { processed: true, reason: 'payment_failed', status: transaction.status };
  }

  await PagoSuscripcion.findByIdAndUpdate(pago._id, {
    estado: transaction.status,
    respuestaWompi: transaction,
  });
  return { processed: true, reason: 'status_updated', status: transaction.status };
}

module.exports = {
  calcularFechaProximoCobro,
  getEmpresaId,
  iniciarCheckout,
  crearPagoCon3DS,
  activarSuscripcionPorPago,
  marcarPagoFallido,
  crearFuentePagoRenovable,
  consultarEstadoFuentePago,
  procesarWebhookTransaccion,
  isPaidPlan,
};
