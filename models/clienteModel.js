const mongoose = require('mongoose');

const clienteSchema = mongoose.Schema(
  {
    nombreCompleto: {
      type: String,
      required: [true, 'Por favor ingrese el nombre completo'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    documentoTipo: {
      type: String,
      default: '',
      trim: true,
      enum: ['', 'cedula', 'cedula_extranjeria', 'ppt', 'rut', 'nit'],
    },
    documentoNumero: {
      type: String,
      default: '',
      trim: true,
      maxlength: 30,
    },
    indicativo: {
      type: String,
      default: '+57',
      trim: true,
      maxlength: 6,
    },
    telefono: {
      type: String,
      required: [true, 'Por favor ingrese el teléfono'],
      trim: true,
      maxlength: 15,
    },
    direccion: {
      type: String,
      required: [true, 'Por favor ingrese la dirección'],
      trim: true,
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

module.exports = mongoose.model('Cliente', clienteSchema);
