const mongoose = require('mongoose');

const facturaSchema = mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
    },
    ivaPorcentaje: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    consecutivo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consecutivo',
      required: true,
    },
    estado: {
      type: Boolean,
      default: true,
    },
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Factura', facturaSchema);
