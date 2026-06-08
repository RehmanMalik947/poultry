/**
 * Send email (e.g. login password to organization).
 * Configure in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 * If not configured, logs to console and resolves (no error).
 */
const nodemailer = require("nodemailer");

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: port === "465",
    auth: { user, pass },
  });
}

/**
 * Send login credentials after registration (no Super Admin approval).
 * @param {string} toEmail - User email
 * @param {string} userName - User name
 * @param {string} organizationName - Organization name
 * @param {string} password - Plain password to include in email
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
async function sendLoginCredentials(toEmail, userName, organizationName, password) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@salonpro.com";
  const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const subject = "Your Salon Pro login details";
  const text = `
Hello ${userName},

Your account for "${organizationName}" is ready.

Sign in to your dashboard with:

  Email: ${toEmail}
  Password: ${password}

Login at: ${loginUrl}/login

— Salon Pro Team
  `.trim();

  const html = `
    <p>Hello ${userName},</p>
    <p>Your account for <strong>${organizationName}</strong> is ready.</p>
    <p>Sign in with:</p>
    <ul>
      <li><strong>Email:</strong> ${toEmail}</li>
      <li><strong>Password:</strong> ${password}</li>
    </ul>
    <p><a href="${loginUrl}/login">Login here</a></p>
    <p>— Salon Pro Team</p>
  `;

  if (!transporter) {
    console.log("[EMAIL not configured] Would send to:", toEmail);
    console.log("[EMAIL] Subject:", subject);
    console.log("[EMAIL] Password:", password);
    return { sent: false, error: "SMTP not configured" };
  }

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Send email error:", err);
    return { sent: false, error: err.message };
  }
}

/**
 * Send notification that the organization account has been approved.
 */
async function sendApprovalNotification(toEmail, userName, organizationName) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@salonpro.com";
  const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const subject = "Your Salon Pro account is now Active!";
  const text = `
Hello ${userName},

Great news! Your account for "${organizationName}" has been approved and is now active.
You can now log in using the credentials we sent you previously.

Login at: ${loginUrl}/login

— Salon Pro Team
  `.trim();

  const html = `
    <p>Hello ${userName},</p>
    <p>Great news! Your account for <strong>${organizationName}</strong> has been approved and is now active.</p>
    <p>You can now log in using the credentials we sent you previously.</p>
    <p><a href="${loginUrl}/login">Login here</a></p>
    <p>— Salon Pro Team</p>
  `;

  if (!transporter) {
    console.log("[EMAIL not configured] Would send approval notification to:", toEmail);
    return { sent: false, error: "SMTP not configured" };
  }

  try {
    await transporter.sendMail({ from, to: toEmail, subject, text, html });
    return { sent: true };
  } catch (err) {
    console.error("Send email error:", err);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendLoginCredentials, sendApprovalNotification };
