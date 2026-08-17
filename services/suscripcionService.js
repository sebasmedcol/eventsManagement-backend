/**
 * Lógica de negocio — suscripciones SaaS + Wompi
 */

const Empresa = require('../models/empresaModel');
const Suscripcion = require('../models/suscripcionModel');
const PagoSuscripcion = require('../models/pagoSuscripcionModel');
const { sendEmail } = require('./emailService');
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
  createRecurringTransaction,
  getTransactionPublic,
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
  const suscripcion = await Suscripcion.findOne({ empresa: empresaId }).select('_id');

  const signature = generateIntegritySignature(reference, amountInCents);

  return {
    suscripcionId: suscripcion ? suscripcion._id : null,
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

  let suscripcion = await Suscripcion.findOne({ empresa: empresaId });
  if (!suscripcion) {
    suscripcion = await Suscripcion.create({
      empresa: empresaId,
      planId: normalized,
      estado: 'pendiente_pago',
      montoMensualCents: getPlanPriceCents(normalized),
      autoRenovacion: false,
    });
  } else if (suscripcion.estado !== 'activa') {
    suscripcion.planId = normalized;
    suscripcion.estado = 'pendiente_pago';
    suscripcion.montoMensualCents = getPlanPriceCents(normalized);
    await suscripcion.save();
  }

  if (empresa.estadoSuscripcion !== 'activa') {
    await Empresa.findByIdAndUpdate(empresaId, {
      estadoSuscripcion: 'pendiente_pago',
    });
  }

  const amountInCents = getPlanPriceCents(normalized);
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
    const [empresa, suscripcion, pagoAprobado] = await Promise.all([
      Empresa.findById(pago.empresa).select('estadoSuscripcion'),
      Suscripcion.findOne({ empresa: pago.empresa }).select('estado'),
      PagoSuscripcion.exists({
        empresa: pago.empresa,
        estado: 'APPROVED',
        _id: { $ne: pago._id },
      }),
    ]);

    const yaActiva =
      empresa?.estadoSuscripcion === 'activa' ||
      suscripcion?.estado === 'activa' ||
      Boolean(pagoAprobado);

    if (!yaActiva) {
      await Empresa.findByIdAndUpdate(pago.empresa, { estadoSuscripcion: 'pendiente_pago' });
    }
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
    console.error('[DEBUG Wompi Error]:', JSON.stringify(error.response?.data, null, 2));
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

async function procesarCobroMensual(suscripcion) {
  const empresaId = suscripcion.empresa;
  const isDryRun = process.env.CRON_DRY_RUN === 'true';

  // Generar referencia única por empresa + mes
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const reference = `SUB-${String(empresaId).slice(-6)}-${yearMonth}`.toUpperCase();

  // Idempotencia: si ya existe un pago PENDING/APPROVED para esta referencia, no duplicar
  const existente = await PagoSuscripcion.findOne({ wompiReference: reference });
  if (existente && ['PENDING', 'APPROVED'].includes(existente.estado)) {
    console.log(`[Cron] Pago ya existe para ${reference} (${existente.estado}) — omitido.`);
    return { skipped: true, reason: 'already_exists', reference };
  }

  if (isDryRun) {
    console.log(`[Cron DRY_RUN] Habría cobrado ${suscripcion.montoMensualCents} COP a empresa ${empresaId} (ref: ${reference})`);
    return { dryRun: true, reference, amountInCents: suscripcion.montoMensualCents };
  }

  const empresa = await Empresa.findById(empresaId).select('email wompiPaymentSourceId');
  if (!empresa?.wompiPaymentSourceId) {
    console.warn(`[Cron] Empresa ${empresaId} sin wompiPaymentSourceId — omitida.`);
    return { skipped: true, reason: 'no_payment_source', empresaId };
  }

  const amountInCents = suscripcion.montoMensualCents;
  const signature = generateIntegritySignature(reference, amountInCents);

  let transaction;
  try {
    transaction = await createRecurringTransaction({
      amountInCents,
      reference,
      customerEmail: empresa.email,
      paymentSourceId: suscripcion.wompiPaymentSourceId,
      signature,
      installments: 1,
    });
  } catch (error) {
    const msg =
      error.response?.data?.error?.messages?.join?.(' ') ||
      error.response?.data?.error?.reason ||
      error.message;
    console.error(`[Cron] Error Wompi para ${reference}:`, msg);
    return { error: true, reference, message: msg };
  }

  // Registrar PagoSuscripcion de tipo renovacion
  await PagoSuscripcion.create({
    empresa: empresaId,
    suscripcion: suscripcion._id,
    planId: suscripcion.planId,
    wompiTransactionId: transaction.id,
    wompiReference: reference,
    montoCents: amountInCents,
    estado: transaction.status || 'PENDING',
    tipo: 'renovacion',
    metodoPago: suscripcion.metodoPago?.tipo || 'CARD',
    respuestaWompi: transaction,
  });

  console.log(`[Cron] Transacción creada: ${transaction.id} | ${transaction.status} | ref: ${reference}`);
  return { transactionId: transaction.id, reference, status: transaction.status };
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

    // Si es renovación exitosa, resetear intentos fallidos
    if (pago.tipo === 'renovacion') {
      await Suscripcion.findOneAndUpdate(
        { empresa: pago.empresa },
        { intentosCobroFallidos: 0 }
      );
    }

    const planConfig = getPlanConfig(pago.planId);
    const empresaDoc = await Empresa.findById(pago.empresa);
    if (empresaDoc) {
      await sendEmail({
        to: empresaDoc.email,
        templateName: 'pago_exitoso',
        data: {
          nombrePlan: planConfig.nombre,
          monto: transaction.amount_in_cents / 100,
          referencia: transaction.reference
        }
      });
    }

    return { processed: true, reason: 'activated', status: 'APPROVED' };
  }

  if (['DECLINED', 'ERROR', 'VOIDED'].includes(transaction.status)) {
    // Para renovaciones fallidas → marcar past_due e incrementar intentos
    if (pago.tipo === 'renovacion') {
      const suscripcion = await Suscripcion.findOne({ empresa: pago.empresa });
      if (suscripcion) {
        const nuevosIntentos = (suscripcion.intentosCobroFallidos || 0) + 1;
        const nuevoEstado = nuevosIntentos >= 3 ? 'expirada' : 'past_due';

        await Suscripcion.findOneAndUpdate(
          { empresa: pago.empresa },
          {
            estado: nuevoEstado,
            intentosCobroFallidos: nuevosIntentos,
          }
        );

        await Empresa.findByIdAndUpdate(pago.empresa, {
          estadoSuscripcion: nuevoEstado,
          ...(nuevoEstado === 'expirada' ? { plan: 'free_trial' } : {}),
        });

        console.log(`[Webhook] Renovación fallida empresa ${pago.empresa}: intento ${nuevosIntentos}/3 → estado ${nuevoEstado}`);
      }
    }

    await marcarPagoFallido(transaction.id, transaction.status, transaction);
    
    const planConfig = getPlanConfig(pago.planId);
    const empresaDoc = await Empresa.findById(pago.empresa);
    if (empresaDoc) {
      await sendEmail({
        to: empresaDoc.email,
        templateName: 'pago_fallido',
        data: {
          nombrePlan: planConfig.nombre,
          monto: transaction.amount_in_cents / 100
        }
      });
    }

    return { processed: true, reason: 'payment_failed', status: transaction.status };
  }

  await PagoSuscripcion.findByIdAndUpdate(pago._id, {
    estado: transaction.status,
    respuestaWompi: transaction,
  });
  return { processed: true, reason: 'status_updated', status: transaction.status };
}

/**
 * Conciliación automática de PagosSuscripcion que siguen en estado PENDING
 * pero que en Wompi ya cerraron en estado final distinto (APPROVED, DECLINED,
 * ERROR, VOIDED). Diseñado para correr una vez al día como cron job o
 * mediante endpoint manual.
 *
 * Criterio:
 * - PagoSuscripcion.estado === 'PENDING'
 * - createdAt sea anterior a `minutosAtras` minutos (default 60) para no
 *   interferir con pagos en curso (3DS challenge puede demorar).
 *
 * Retorna resumen de lo procesado.
 */
async function conciliarPagosPendientes({ minutosAtras = 60 } = {}) {
  const threshold = new Date(Date.now() - minutosAtras * 60 * 1000);
  const pagosPendientes = await PagoSuscripcion.find({
    estado: 'PENDING',
    wompiTransactionId: { $exists: true, $ne: null },
    createdAt: { $lte: threshold },
  });

  const resumen = {
    total: pagosPendientes.length,
    aprobados: 0,
    fallidos: 0,
    permanecenPending: 0,
    error: 0,
    idsError: [],
  };

  const conciliarUno = async (pago) => {
    try {
      const tx = await getTransactionPublic(pago.wompiTransactionId);
      const estadoFinal = tx?.status;

      if (estadoFinal === 'APPROVED' && pago.estado !== 'APPROVED') {
        await activarSuscripcionPorPago({
          empresaId: pago.empresa,
          planId: pago.planId,
          wompiTransactionId: pago.wompiTransactionId,
          wompiReference: tx.reference || pago.wompiReference,
          montoCents: tx.amount_in_cents || pago.montoCents,
          respuestaWompi: tx,
        });
        if (pago.tipo === 'renovacion') {
          await Suscripcion.findOneAndUpdate(
            { empresa: pago.empresa },
            { intentosCobroFallidos: 0 }
          );
        }
        resumen.aprobados++;
        return;
      }

      if (['DECLINED', 'ERROR', 'VOIDED'].includes(estadoFinal) && pago.estado !== estadoFinal) {
        if (pago.tipo === 'renovacion') {
          const suscripcion = await Suscripcion.findOne({ empresa: pago.empresa });
          if (suscripcion && suscripcion.estado === 'activa') {
            const nuevosIntentos = (suscripcion.intentosCobroFallidos || 0) + 1;
            const nuevoEstado = nuevosIntentos >= 3 ? 'expirada' : 'past_due';
            await Suscripcion.findByIdAndUpdate(suscripcion._id, {
              estado: nuevoEstado,
              intentosCobroFallidos: nuevosIntentos,
            });
            await Empresa.findByIdAndUpdate(pago.empresa, {
              estadoSuscripcion: nuevoEstado,
              ...(nuevoEstado === 'expirada' ? { plan: 'free_trial' } : {}),
            });
          }
        }
        await marcarPagoFallido(pago.wompiTransactionId, estadoFinal, tx);
        resumen.fallidos++;
        return;
      }

      resumen.permanecenPending++;
    } catch (err) {
      resumen.error++;
      resumen.idsError.push(String(pago._id));
      console.error(
        `[Conciliacion] Error al conciliar pago ${pago.wompiTransactionId}:`,
        err.message
      );
    }
  };

  // Conciliar en lotes pequeños para no saturar la API de Wompi.
  const BATCH = 10;
  for (let i = 0; i < pagosPendientes.length; i += BATCH) {
    await Promise.all(pagosPendientes.slice(i, i + BATCH).map(conciliarUno));
  }

  console.log('[Conciliacion] Resumen:', resumen);
  return resumen;
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
  procesarCobroMensual,
  procesarWebhookTransaccion,
  conciliarPagosPendientes,
  isPaidPlan,
};
