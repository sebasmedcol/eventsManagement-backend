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
    fechaInicio: {
      type: Date,
      required: true,
    },
    fechaFin: {
      type: Date,
      required: true,
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
    eventoInicio: {
      type: Date,
    },
    eventoFin: {
      type: Date,
    },
    soloCobrarTiempoEvento: {
      type: Boolean,
      default: false,
    },
    loadInInicio: {
      type: Date,
    },
    loadOutFin: {
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
    ivaPorcentaje: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    ivaValor: {
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
    saldoPendiente: {
      type: Number,
      default: 0,
      min: 0,
    },
    estadoPago: {
  type: String,
  enum: ['pendiente', 'pago_parcial', 'pagada', 'vencida'],
  default: 'pendiente',
},
fechaLimitePago: {
  type: Date,
  default: null,
},
    estado: {
      type: String,
      enum: ['activa', 'cancelada'],
      default: 'activa',
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

ventaSchema.index({ empresa: 1, fechaInicio: 1, fechaFin: 1 });
ventaSchema.index({ 'productos.producto': 1 });

module.exports = mongoose.model('Venta', ventaSchema);
