const mongoose = require('mongoose');

const eventoFichaProductoSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const eventoFichaSchema = mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
    },
    evento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventoPremium',
      required: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    descripcion: {
      type: String,
      default: '',
      trim: true,
      maxlength: 400,
    },
    color: {
      type: String,
      default: 'info',
      trim: true,
      enum: ['primary', 'secondary', 'success', 'warning', 'error', 'info'],
    },
    responsable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    notificacionLeidaPor: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Usuario',
      default: [],
    },
    tipoDeServicio: {
      type: String,
      required: true,
      trim: true,
      enum: ['Alquiler', 'Venta', 'Notas'],
    },
    nota: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    productos: {
      type: [eventoFichaProductoSchema],
      default: [],
    },
    venta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venta',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

eventoFichaSchema.index({ empresa: 1, evento: 1 });
eventoFichaSchema.index({ empresa: 1, responsable: 1 });
eventoFichaSchema.index({ empresa: 1, tipoDeServicio: 1 });

module.exports = mongoose.model('EventoFicha', eventoFichaSchema);
