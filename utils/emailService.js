const nodemailer = require("nodemailer");
const logger     = require("./logger");

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === "smtp.sendgrid.net" && !process.env.SMTP_PASS?.startsWith("SG.")) {
    logger.warn(`Email skipped (SMTP not configured): ${subject} → ${to}`);
    return { messageId: "skipped" };
  }
  try {
    const t = createTransporter();
    const info = await t.sendMail({ from: `"${process.env.FROM_NAME || "LifeOS"}" <${process.env.FROM_EMAIL}>`, to, subject, html });
    logger.info(`Email sent: ${info.messageId} → ${to}`);
    return info;
  } catch (err) { logger.error("Email failed:", err.message); throw err; }
};

const sendWelcome = (user) => sendEmail({
  to: user.email, subject: "Welcome to LifeOS 🚀",
  html: `<h1>Welcome, ${user.name}!</h1><p>Your LifeOS account is ready. Start building better habits today.</p>`,
});

const sendPasswordReset = (user, resetUrl) => sendEmail({
  to: user.email, subject: "Reset your LifeOS password",
  html: `<h2>Password Reset</h2><p>Click below to reset your password (expires in 1 hour):</p><a href="${resetUrl}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a>`,
});

module.exports = { sendEmail, sendWelcome, sendPasswordReset };
