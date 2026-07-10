const mongoose = require('mongoose');

const empresaSchema = mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      unique: true,
    },
    nit: {
      type: String,
      required: false,
      trim: true,
      maxlength: 20,
    },
    direccion: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    telefono: {
      type: String,
      default: '',
      trim: true,
      maxlength: 15,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    logo: {
      format: {
        type: String,
        enum: ['svg', 'webp'],
        default: null,
      },
      dataBase64: {
        type: String,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    mostrarLogoEnComprobante: {
      type: Boolean,
      default: true,
    },
    // Plan de suscripcion actualizado con los nuevos valores
    plan: {
      type: String,
      default: 'free_trial',
      trim: true,
      enum: ['default', 'free', 'free_trial', 'basic', 'basico', 'pro', 'premium', 'super'],
    },
    estado: {
      type: Boolean,
      default: true,
    },
    estadoAprobacion: {
      type: String,
      enum: ['pendiente', 'aprobada', 'rechazada'],
      default: 'aprobada',
    },
    solicitudToken: {
      type: String,
      default: null,
    },
    solicitudExpira: {
      type: Date,
      default: null,
    },
    // Fecha de creacion para calcular trial
    fechaCreacion: {
      type: Date,
      default: Date.now,
    },
    // --- Suscripción SaaS (pasarela Wompi) ---
    estadoSuscripcion: {
      type: String,
      enum: ['trial', 'activa', 'pendiente_pago', 'past_due', 'cancelada', 'expirada'],
      default: 'trial',
    },
    fechaInicioSuscripcion: Date,
    fechaProximoCobro: Date,
    fechaFinSuscripcion: Date,
    wompiPaymentSourceId: String,
    wompiCustomerEmail: String,
    metodoPagoTipo: {
      type: String,
      enum: ['CARD', 'NEQUI', null],
      default: null,
    },
    metodoPagoUltimos4: String,
    autoRenovacion: {
      type: Boolean,
      default: true,
    },
    cancelacionSolicitadaEn: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Empresa', empresaSchema);
