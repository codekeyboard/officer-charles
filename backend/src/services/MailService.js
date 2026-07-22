class MailService {
  async sendVerificationCode({ to, name, code }) {
    const subject = 'Your Officer Charles verification code';
    const text = [
      `Hi ${name || 'there'},`,
      '',
      `Your Officer Charles verification code is ${code}.`,
      'This code expires in 10 minutes.',
      '',
      'If you did not create an account, you can ignore this email.'
    ].join('\n');
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>Your Officer Charles verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not create an account, you can ignore this email.</p>
      </div>
    `;

    return this.sendMail({ to, subject, text, html });
  }

  async sendMail(message) {
    if (process.env.NODE_ENV === 'test') return { delivered: false, logged: true };

    const mailConfig = resolveMailConfig();
    if (!mailConfig.configured) {
      console.log(`[email:dev] ${message.subject} -> ${message.to}\n${message.text}`);
      return { delivered: false, logged: true };
    }

    if (mailConfig.provider === 'brevo_api') {
      return sendBrevoApiMail(mailConfig, message);
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.user
        ? { user: mailConfig.user, pass: mailConfig.pass || '' }
        : undefined
    });

    await transporter.sendMail({
      from: mailConfig.from,
      ...message
    });
    return { delivered: true, logged: false, provider: mailConfig.provider };
  }
}

function resolveMailConfig() {
  const provider = String(process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
  if (provider === 'brevo_api' || provider === 'brevo-api') {
    const apiKey = String(process.env.BREVO_API_KEY || '').trim();
    const from = String(process.env.BREVO_FROM || process.env.SMTP_FROM || '').trim();
    return {
      provider: 'brevo_api',
      apiKey,
      from,
      configured: Boolean(apiKey && from)
    };
  }

  if (provider === 'brevo') {
    const host = String(process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com').trim();
    const user = String(process.env.BREVO_SMTP_USER || '').trim();
    const pass = String(process.env.BREVO_SMTP_KEY || '').trim();
    const from = String(process.env.BREVO_FROM || process.env.SMTP_FROM || '').trim();
    return {
      provider: 'brevo',
      host,
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: String(process.env.BREVO_SMTP_SECURE || 'false').toLowerCase() === 'true',
      user,
      pass,
      from: from || user,
      configured: Boolean(host && user && pass && (from || user))
    };
  }

  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const from = String(process.env.SMTP_FROM || '').trim();
  return {
    provider: 'smtp',
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user,
    pass: process.env.SMTP_PASS || '',
    from: from || user,
    configured: Boolean(host && (from || user))
  };
}

async function sendBrevoApiMail(config, message) {
  try {
    require('node:dns').setDefaultResultOrder('ipv4first');
  } catch {
    // Older Node versions may not support this setting; Brevo will still return a clear error.
  }

  const sender = parseEmailIdentity(config.from);
  const recipient = parseEmailIdentity(message.to);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender,
      to: [recipient],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text
    })
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { message: bodyText };
  }

  if (!response.ok) {
    const error = new Error(body.message || `Brevo API request failed with status ${response.status}`);
    error.statusCode = response.status;
    error.brevoResponse = body;
    throw error;
  }

  return { delivered: true, logged: false, provider: config.provider, messageId: body.messageId || null };
}

function parseEmailIdentity(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(.*?)\s*<([^<>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^"|"$/g, '').trim() || undefined,
      email: match[2].trim()
    };
  }
  return { email: raw };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = new MailService();
module.exports.MailService = MailService;
module.exports.resolveMailConfig = resolveMailConfig;
