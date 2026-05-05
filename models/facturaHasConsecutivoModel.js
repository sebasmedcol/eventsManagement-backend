const mongoose = require('mongoose');

const facturaHasConsecutivoSchema = mongoose.Schema(
  {
    factura: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Factura',
      required: true,
    },
    consecutivo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consecutivo',
      required: true,
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

module.exports = mongoose.model('FacturaHasConsecutivo', facturaHasConsecutivoSchema);
