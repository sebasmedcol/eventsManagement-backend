const mongoose = require('mongoose');

const consecutivoSchema = mongoose.Schema(
  {
    fecha: {
      type: Date,
      default: Date.now,
    },
    contador: {
      type: Number,
      required: true,
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

module.exports = mongoose.model('Consecutivo', consecutivoSchema);
