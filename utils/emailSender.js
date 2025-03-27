// Backend/utils/emailSender.js

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // "aprendizarmticamericas@gmail.com"
    pass: process.env.EMAIL_PASS,  // "nvro mcrm pkid qgmf"
  },
});

/**
 * Envía un correo usando nodemailer.
 * @param {Object} options
 * @param {string} options.to      - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} [options.text]  - Texto plano
 * @param {string} [options.html]  - HTML
 */
async function sendMail({ to, subject, text, html }) {
  await transporter.sendMail({
    from: `"TIC Americas" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };
