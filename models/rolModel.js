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

const rolSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'Por favor ingrese un nombre para el rol'],
      maxlength: 50,
      trim: true,
    },
    descripcion: {
      type: String,
      maxlength: 200,
      trim: true,
      default: '',
    },
    permisos: {
      type: Map,
      of: permisoCrudSchema,
      default: {},
    },
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
    },
    activo: {
      type: Boolean,
      default: true,
    },
    esPredeterminado: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índice compuesto para nombre único por empresa
rolSchema.index({ nombre: 1, empresa: 1 }, { unique: true });

module.exports = mongoose.model('Rol', rolSchema);
