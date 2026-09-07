const mongoose = require('mongoose');
const Venta = require('./ventaModel');

const ventaArchivadaSchema = new mongoose.Schema(
  {
    ...Venta.schema.obj,
    ventaOriginal: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    anioVenta: {
      type: Number,
      required: true,
      index: true,
    },
    fechaArchivado: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true, collection: 'ventasArchivadas' }
);

ventaArchivadaSchema.index({ empresa: 1, anioVenta: 1, fecha: 1 });
ventaArchivadaSchema.index({ empresa: 1, ventaOriginal: 1 }, { unique: true });

module.exports = mongoose.model('VentaArchivada', ventaArchivadaSchema);