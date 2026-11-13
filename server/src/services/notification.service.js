const env = require('../config/env');

let nodemailerInstance = null;
let nodemailerConfigKey = '';

function getNodemailer() {
  const gmailUser = env.GMAIL_USER || (env.SMTP_USER.endsWith('@gmail.com') ? env.SMTP_USER : '');
  const gmailPass = env.GMAIL_APP_PASSWORD || (gmailUser ? env.SMTP_PASS.replace(/\s+/g, '') : '');
  const host = env.SMTP_HOST || (gmailUser && gmailPass ? 'smtp.gmail.com' : '');
  const port = env.SMTP_HOST ? env.SMTP_PORT : 465;
  const secure = env.SMTP_HOST ? env.SMTP_SECURE : true;
  const user = env.SMTP_USER || gmailUser;
  const pass = env.SMTP_HOST ? env.SMTP_PASS : gmailPass;

  if (!host || !user || !pass) {
    return null;
  }

  const nextKey = `${host}:${port}:${user}`;
  if (!nodemailerInstance || nodemailerConfigKey !== nextKey) {
    try {
      const nodemailer = require('nodemailer');
      nodemailerInstance = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      nodemailerConfigKey = nextKey;
    } catch (err) {
      console.warn('[Notification] Nodemailer transport creation warning:', err.message);
      return null;
    }
  }
  return {
    transporter: nodemailerInstance,
    fromAddress: env.EMAIL_FROM || `MarketOS <${user}>`,
    provider: host === 'smtp.gmail.com' ? 'gmail' : 'smtp',
  };
}

function buildOtpEmailHtml({ code, recipientName, purpose, expiresInMinutes = 10 }) {
  const isSignup = purpose === 'SIGNUP';
  const actionText = isSignup ? 'complete your MarketOS registration' : 'sign in to your MarketOS workspace';
  const title = isSignup ? 'Confirm Your MarketOS Account' : 'MarketOS Security Verification Code';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #F8FAFC;
      margin: 0;
      padding: 32px 16px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #0B1F44;
      border: 1px solid #1E3A8A;
      border-radius: 20px;
      padding: 36px 28px;
      box-shadow: 0 12px 30px -6px rgba(11, 31, 68, 0.55);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #1E3A8A;
    }
    .logo-badge {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: #ffffff;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 17px;
      line-height: 40px;
      text-align: center;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #F8FAFC;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 12px;
      color: #94A3B8;
      margin: 2px 0 0 0;
    }
    h2 {
      color: #F8FAFC;
      font-size: 18px;
      margin: 0 0 12px 0;
    }
    p {
      color: #CBD5E1;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 18px 0;
    }
    .otp-box {
      background: #061229;
      border: 2px solid #2563EB;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #60A5FA;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #93C5FD;
      display: inline-block;
      margin: 4px 0;
    }
    .otp-hint {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 8px;
    }
    .footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">M</div>
      <div style="margin-left: 12px;">
        <h1 class="brand-title">MarketOS</h1>
        <p class="brand-subtitle">Run your market. Smarter.</p>
      </div>
    </div>

    <h2>Hello ${recipientName || 'there'},</h2>
    <p>Use the 6-digit verification code below to ${actionText}:</p>

    <div class="otp-box">
      <div class="otp-label">${isSignup ? 'Registration OTP Code' : 'Sign-In OTP Code'}</div>
      <div class="otp-code">${code}</div>
      <div class="otp-hint">Expires in ${expiresInMinutes} minutes</div>
    </div>

    <p>Never share this code with anyone. MarketOS team members will never ask for your verification code.</p>

    <div class="footer">
      This automated security email was sent by MarketOS.<br>
      If you did not request this verification code, you can safely ignore this message.
    </div>
  </div>
</body>
</html>
  `;
}

function buildWelcomeEmailHtml({ recipientName, businessName, currency = 'NGN' }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MarketOS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #F8FAFC;
      margin: 0;
      padding: 32px 16px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 36px 28px;
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    h1 {
      color: #F8FAFC;
      font-size: 22px;
      margin: 0 0 12px 0;
    }
    p {
      color: #CBD5E1;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    .card {
      background: #0F172A;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 18px;
      margin: 20px 0;
    }
    .row {
      font-size: 13px;
      color: #94A3B8;
      margin: 6px 0;
    }
    .row strong {
      color: #F8FAFC;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Workspace Activated</div>
    <h1>Welcome to MarketOS, ${recipientName || 'Trader'}!</h1>
    <p>Your retail inventory and cashbook workspace is now active and ready to record sales and stock movements.</p>
    <div class="card">
      <div class="row">Store / Business: <strong>${businessName || 'Retail Store'}</strong></div>
      <div class="row">Default Currency: <strong>${currency}</strong></div>
      <div class="row">Status: <strong style="color:#34D399;">Approved & Active</strong></div>
    </div>
    <p>You can now add stock, sell items from the Point of Sale counter or Inventory tab, and track all movements in your Activity History.</p>
    <div class="footer">MarketOS • Retail Inventory & Cashbook Platform</div>
  </div>
</body>
</html>
  `;
}

class NotificationService {
  /**
   * Internal helper to deliver an email through Gmail/SMTP, Resend, or SendGrid
   */
  async deliverEmail({ to, subject, text, html }) {
    // 1. Try Gmail / SMTP via Nodemailer first if configured
    const mailer = getNodemailer();
    if (mailer) {
      try {
        const info = await mailer.transporter.sendMail({
          from: mailer.fromAddress,
          to,
          subject,
          text,
          html,
        });
        console.log(`[Notification:Email] Delivered via ${mailer.provider}:`, info.messageId);
        return { success: true, provider: mailer.provider, id: info.messageId };
      } catch (err) {
        console.warn(`[Notification:Email] ${mailer.provider} delivery failed:`, err.message);
      }
    }

    // 2. Try Resend API
    if (env.RESEND_API_KEY) {
      try {
        const fromAddress = env.EMAIL_FROM || 'MarketOS <onboarding@resend.dev>';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to,
            subject,
            html,
            text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          console.log('[Notification:Email] Delivered via Resend:', data.id);
          return { success: true, provider: 'resend', id: data.id };
        }
        const errText = await res.text();
        console.warn('[Notification:Email] Resend API error:', errText);
      } catch (err) {
        console.warn('[Notification:Email] Resend delivery failed:', err.message);
      }
    }

    // 3. Try SendGrid API
    if (env.SENDGRID_API_KEY) {
      try {
        const rawFrom = env.EMAIL_FROM || 'notifications@marketos.com';
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: rawFrom.replace(/.*<(.+)>/, '$1') },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html },
            ],
          }),
        });
        if (res.ok || res.status === 202) {
          console.log('[Notification:Email] Delivered via SendGrid');
          return { success: true, provider: 'sendgrid' };
        }
        const errText = await res.text();
        console.warn('[Notification:Email] SendGrid API error:', errText);
      } catch (err) {
        console.warn('[Notification:Email] SendGrid delivery failed:', err.message);
      }
    }

    // 4. Fallback: Simulated console delivery when no email provider key is set yet
    console.log(`[Notification:Email] (Simulated Delivery) To: ${to} | Subject: ${subject}`);
    return { success: true, provider: 'console-simulated' };
  }

  /**
   * Send Email Notification with 6-digit OTP
   */
  async sendEmailOtp({ to, code, recipientName = '', purpose = 'LOGIN' }) {
    const isSignup = purpose === 'SIGNUP';
    const subject = isSignup
      ? `${code} is your MarketOS registration code`
      : `${code} is your MarketOS sign-in code`;
    const text = `Hello ${recipientName || 'there'},\n\nYour MarketOS verification code is: ${code}\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`;
    const html = buildOtpEmailHtml({ code, recipientName, purpose });

    console.log(`[Notification:Email] Sending OTP ${code} to ${to} (${purpose})`);
    return this.deliverEmail({ to, subject, text, html });
  }

  /**
   * Send Welcome Email Notification after account creation
   */
  async sendWelcomeEmail({ to, recipientName = '', businessName = '', currency = 'NGN' }) {
    if (!to) return { success: false };
    const subject = `Welcome to MarketOS — ${businessName || 'Your Store'} is Ready!`;
    const text = `Hello ${recipientName || 'there'},\n\nWelcome to MarketOS! Your store workspace (${businessName || 'Retail Store'}) is now active with default currency ${currency}.`;
    const html = buildWelcomeEmailHtml({ recipientName, businessName, currency });

    return this.deliverEmail({ to, subject, text, html });
  }
}

module.exports = new NotificationService();
