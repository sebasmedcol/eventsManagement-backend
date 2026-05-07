const mongoose = require('mongoose');

const cotizacionSchema = mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
    },
    tipoDeServicio: {
      type: String,
      enum: ['Venta', 'Alquiler'],
      required: true,
    },
    fechaExpedicion: {
      type: Date,
      default: Date.now,
    },
    productos: [
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
    ],
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    estado: {
      type: String,
      enum: ['borrador', 'enviada', 'aceptada', 'rechazada'],
      default: 'borrador',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Cotizacion', cotizacionSchema);
