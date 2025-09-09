const mongoose = require('mongoose');

const productoSchema = mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'Por favor ingrese el nombre del producto'],
    },
    descripcion: {
      type: String,
      required: [true, 'Por favor ingrese la descripción del producto'],
    },
    precio: {
      type: Number,
      required: [true, 'Por favor ingrese el precio del producto'],
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

module.exports = mongoose.model('Producto', productoSchema);