const mongoose = require('mongoose');

const permisoCrudSchema = new mongoose.Schema(
  {
    crear: { type: Boolean, default: false },
    ver: { type: Boolean, default: false },
    editar: { type: Boolean, default: false },
    eliminar: { type: Boolean, default: false },
  },
  { _id: false }
);

const usuarioSchema = mongoose.Schema(
  {
    nombreUsuario: {
      type: String,
      required: [true, 'Por favor ingrese un nombre de usuario'],
      unique: true,
      maxlength: 50,
      trim: true,
    },
    email: {
      type: String,
      maxlength: 254,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Por favor ingrese un email válido'],
    },
    indicativo: {
      type: String,
      default: '+57',
      maxlength: 6,
      trim: true,
    },
    telefono: {
      type: String,
      maxlength: 15,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Por favor ingrese una contraseña'],
    },
    rol: {
      type: String,
      enum: ['admin', 'operador', 'usuario', 'superadmin'],
      default: 'operador',
    },
    icono: {
      type: String,
      default: '',
      maxlength: 30,
      trim: true,
    },
    esAdminPrincipal: {
      type: Boolean,
      default: false,
    },
    permisos: {
      type: Map,
      of: permisoCrudSchema,
      default: {},
    },
    rol_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rol',
      default: null,
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

module.exports = mongoose.model('Usuario', usuarioSchema);
