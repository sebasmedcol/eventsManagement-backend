const mongoose = require('mongoose');

const suscripcionSchema = mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      unique: true,
    },
    planId: {
      type: String,
      required: true,
      enum: ['basico', 'pro', 'premium'],
    },
    estado: {
      type: String,
      enum: ['pendiente_pago', 'activa', 'past_due', 'cancelada', 'expirada'],
      default: 'pendiente_pago',
    },
    wompiPaymentSourceId: {
      type: String,
      default: null,
    },
    metodoPago: {
      tipo: {
        type: String,
        enum: ['CARD', 'NEQUI', null],
        default: null,
      },
      ultimos4: String,
      marca: String,
      expiraEn: String,
    },
    montoMensualCents: {
      type: Number,
      required: true,
      min: 0,
    },
    moneda: {
      type: String,
      default: 'COP',
    },
    fechaInicio: Date,
    fechaProximoCobro: Date,
    fechaUltimoCobro: Date,
    intentosCobroFallidos: {
      type: Number,
      default: 0,
    },
    autoRenovacion: {
      type: Boolean,
      default: true,
    },
    canceladaEn: Date,
    motivoCancelacion: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

suscripcionSchema.index({ estado: 1, fechaProximoCobro: 1 });

module.exports = mongoose.model('Suscripcion', suscripcionSchema);
