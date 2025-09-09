const mongoose = require('mongoose');

const usuarioSchema = mongoose.Schema(
  {
    nombreUsuario: {
      type: String,
      required: [true, 'Por favor ingrese un nombre de usuario'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Por favor ingrese una contraseña'],
    },
    rol: {
      type: String,
      enum: ['admin', 'usuario'],
      default: 'usuario',
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

module.exports = mongoose.model('Usuario', usuarioSchema);