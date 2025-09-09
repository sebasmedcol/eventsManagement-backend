const mongoose = require('mongoose');

const clienteSchema = mongoose.Schema(
  {
    nombreCompleto: {
      type: String,
      required: [true, 'Por favor ingrese el nombre completo'],
    },
    telefono: {
      type: String,
      required: [true, 'Por favor ingrese el teléfono'],
    },
    direccion: {
      type: String,
      required: [true, 'Por favor ingrese la dirección'],
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

module.exports = mongoose.model('Cliente', clienteSchema);