const mongoose = require('mongoose');

const productoSchema = mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'Por favor ingrese el nombre del producto'],
      trim: true,
    },
    descripcion: {
      type: String,
      required: [true, 'Por favor ingrese la descripción del producto'],
      trim: true,
    },
    codigoSKU: {
    type: String,
    trim: true,
    default: '',
    },
    tipoDeServicio: {
      type: String,
      default: 'Venta',
      trim: true,
      enum: ['Alquiler', 'Venta'],
    },
    tipoDeCobro: {
      type: String,
      default: 'unidad',
      trim: true,
      enum: ['unidad', 'hora'],
    },
    precio: {
      type: Number,
      required: [true, 'Por favor ingrese el precio del producto'],
      min: 0,
    },
    cantidadTotal: {
      type: Number,
      default: 0,
      min: 0,
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

module.exports = mongoose.model('Producto', productoSchema);
