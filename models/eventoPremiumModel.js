const mongoose = require('mongoose');

const eventoPremiumSchema = mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
    },
    tipoDeServicio: {
      type: String,
      default: 'Evento',
      trim: true,
      enum: ['Evento'],
    },
    fechaDelEvento: {
      type: Date,
      required: true,
    },
    responsable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
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

eventoPremiumSchema.index({ empresa: 1, fechaDelEvento: 1 });
eventoPremiumSchema.index({ empresa: 1, cliente: 1 });
eventoPremiumSchema.index({ empresa: 1, responsable: 1 });

module.exports = mongoose.model('EventoPremium', eventoPremiumSchema);
