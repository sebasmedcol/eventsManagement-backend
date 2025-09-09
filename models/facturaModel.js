const mongoose = require('mongoose');

const facturaSchema = mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Factura', facturaSchema);