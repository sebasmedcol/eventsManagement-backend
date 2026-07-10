const mongoose = require('mongoose');

const TIPOS_RECORDATORIO = [
  'trial_3_dias',
  'trial_1_dia',
  'trial_expirado',
  'cobro_7_dias',
  'cobro_3_dias',
  'cobro_1_dia',
  'cobro_fallido_1',
  'cobro_fallido_3',
  'cobro_fallido_7',
  'suscripcion_cancelada',
  'upgrade_confirmado',
];

const recordatorioSchema = mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
    },
    tipo: {
      type: String,
      enum: TIPOS_RECORDATORIO,
      required: true,
    },
    enviadoEn: {
      type: Date,
      default: Date.now,
    },
    destinatario: {
      type: String,
      required: true,
    },
    referenciaId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recordatorio', recordatorioSchema);
module.exports.TIPOS_RECORDATORIO = TIPOS_RECORDATORIO;
