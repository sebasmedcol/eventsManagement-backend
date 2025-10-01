const mongoose = require('mongoose');

const ventaSchema = mongoose.Schema(
  {
    facturaHasConsecutivo: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'FacturaHasConsecutivo',
    },
    // Número de consecutivo asignado a la venta en el momento de creación
    numeroConsecutivo: {
      type: Number,
      default: null,
      min: 0,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Cliente',
    },
    clienteTelefono: {
      type: String,
      default: '',
    },
    clienteDireccion: {
      type: String,
      default: '',
    },
    productos: [
      {
        producto: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Producto',
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
    fecha: {
      type: Date,
      default: Date.now,
    },
    tipoDeServicio: {
      type: String,
      required: [true, 'Por favor ingrese el tipo de servicio'],
    },
    duracionDelEvento: {
      type: String,
    },
    fechaDelEvento: {
      type: Date,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    descuento: {
      type: Number,
      default: 0,
      min: 0,
    },
    abono: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPagar: {
      type: Number,
      required: true,
      min: 0,
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

module.exports = mongoose.model('Venta', ventaSchema);