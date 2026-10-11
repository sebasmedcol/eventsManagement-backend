const mongoose = require('mongoose');

const usagePeriodSchema = mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      index: true,
    },
    suscripcion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Suscripcion',
      default: null,
    },
    planId: {
      type: String,
      required: true,
      enum: ['free_trial', 'basico', 'pro', 'premium'],
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    estado: {
      type: String,
      enum: ['activo', 'cerrado'],
      default: 'activo',
    },
    usage: {
      clientCreations: {
        type: Number,
        default: 0,
        min: 0,
      },
      productCreations: {
        type: Number,
        default: 0,
        min: 0,
      },
      sales: {
        type: Number,
        default: 0,
        min: 0,
      },
      quotes: {
        type: Number,
        default: 0,
        min: 0,
      },
      eventCreations: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

usagePeriodSchema.index({ empresa: 1, periodEnd: -1 });
usagePeriodSchema.index({ empresa: 1, estado: 1, periodStart: -1 });
usagePeriodSchema.index(
  { empresa: 1, estado: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: 'activo' },
  }
);

module.exports = mongoose.model('UsagePeriod', usagePeriodSchema);
