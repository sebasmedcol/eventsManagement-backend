const mongoose = require('mongoose');

const pagoSuscripcionSchema = mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
    },
    suscripcion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Suscripcion',
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    wompiTransactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    wompiReference: {
      type: String,
      required: true,
    },
    montoCents: {
      type: Number,
      required: true,
      min: 0,
    },
    moneda: {
      type: String,
      default: 'COP',
    },
    estado: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'],
      default: 'PENDING',
    },
    tipo: {
      type: String,
      enum: ['primer_pago', 'renovacion', 'upgrade', 'reintento'],
      default: 'primer_pago',
    },
    metodoPago: String,
    fechaTransaccion: {
      type: Date,
      default: Date.now,
    },
    fechaAprobacion: Date,
    respuestaWompi: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    emailEnviado: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

pagoSuscripcionSchema.index({ empresa: 1, createdAt: -1 });
pagoSuscripcionSchema.index({ wompiReference: 1 });

module.exports = mongoose.model('PagoSuscripcion', pagoSuscripcionSchema);
