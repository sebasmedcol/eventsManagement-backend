const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const isMock = process.env.EMAIL_MOCK === 'true';
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || 'mock_user',
    pass: process.env.SMTP_PASS || 'mock_pass',
  },
});

const defaultFrom = process.env.EMAIL_FROM || 'no-reply@nextevents.local';

/**
 * Plantillas de correos
 */
const templates = {
  trial_expirando: (data) => ({
    subject: `Tu período de prueba termina en ${data.diasRestantes} día(s)`,
    html: `
      <h2>¡Hola!</h2>
      <p>Esperamos que estés disfrutando de NextEvents. Te recordamos que tu período de prueba termina en <strong>${data.diasRestantes} día(s)</strong>.</p>
      <p>Para no perder el acceso a tus datos, asegúrate de seleccionar un plan y configurar tu método de pago.</p>
      <br>
      <a href="${process.env.APP_URL}/planes" style="padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">Elegir Plan</a>
    `,
  }),
  trial_expirado: (data) => ({
    subject: `Tu período de prueba ha terminado`,
    html: `
      <h2>¡Hola!</h2>
      <p>Tu período de prueba en NextEvents ha expirado. Tu cuenta ahora se encuentra en modo de solo lectura.</p>
      <p>Para seguir operando tu negocio y disfrutar de todas las funcionalidades, suscríbete a uno de nuestros planes.</p>
      <br>
      <a href="${process.env.APP_URL}/planes" style="padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">Elegir Plan</a>
    `,
  }),
  proximo_cobro: (data) => ({
    subject: `Próximo cobro de tu suscripción en ${data.dias} día(s)`,
    html: `
      <h2>Recordatorio de Suscripción</h2>
      <p>Te recordamos que el próximo cobro por tu plan <strong>${data.nombrePlan}</strong> será en ${data.dias} día(s) (Fecha: ${data.fechaCobro}).</p>
      <p>El monto a cobrar será de <strong>$${data.monto}</strong>.</p>
      <p>Gracias por usar NextEvents.</p>
    `,
  }),
  pago_exitoso: (data) => ({
    subject: `Confirmación de Pago - NextEvents`,
    html: `
      <h2>¡Pago Exitoso!</h2>
      <p>Hemos procesado el pago de tu plan <strong>${data.nombrePlan}</strong> por un monto de <strong>$${data.monto}</strong>.</p>
      <p>Tu suscripción se ha renovado exitosamente. Referencia: ${data.referencia}</p>
      <br>
      <a href="${process.env.APP_URL}/dashboard" style="padding: 10px 20px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 4px;">Ir al Dashboard</a>
    `,
  }),
  pago_fallido: (data) => ({
    subject: `Acción requerida: Problemas con tu pago`,
    html: `
      <h2>¡Atención!</h2>
      <p>No pudimos procesar el pago de tu plan <strong>${data.nombrePlan}</strong> (Monto: $${data.monto}).</p>
      <p>Por favor, actualiza tu método de pago para evitar la suspensión de tu servicio.</p>
      <br>
      <a href="${process.env.APP_URL}/checkout" style="padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 4px;">Actualizar Pago</a>
    `,
  }),
  suscripcion_cancelada: (data) => ({
    subject: `Suscripción Cancelada`,
    html: `
      <h2>Suscripción Cancelada</h2>
      <p>Te confirmamos que tu suscripción al plan <strong>${data.nombrePlan}</strong> ha sido cancelada.</p>
      <p>Tu acceso completo se mantendrá hasta el <strong>${data.fechaFin}</strong>.</p>
      <p>Lamentamos verte partir. ¡Vuelve pronto!</p>
    `,
  }),
};

/**
 * Enviar un correo electrónico
 * @param {Object} options
 * @param {string} options.to - Destinatario(s)
 * @param {string} options.templateName - Nombre de la plantilla ('trial_expirando', 'pago_exitoso', etc.)
 * @param {Object} options.data - Datos para inyectar en la plantilla
 */
async function sendEmail({ to, templateName, data }) {
  if (!to || !templateName || !templates[templateName]) {
    console.error('[EmailService] Parámetros inválidos para sendEmail');
    return false;
  }

  const templateParams = templates[templateName](data);
  
  if (isMock) {
    console.log('\n================== EMAIL MOCK ==================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${templateParams.subject}`);
    console.log(`Template: ${templateName}`);
    console.log('HTML:', templateParams.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()); // Preview texto plano
    console.log('================================================\n');
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to,
      subject: templateParams.subject,
      html: templateParams.html,
    });
    console.log(`[EmailService] Correo enviado a ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error al enviar correo a ${to}:`, error.message);
    return false;
  }
}

module.exports = {
  sendEmail,
};
