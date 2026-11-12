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
    fromAddress: env.EMAIL_FROM || `StockFlow <${user}>`,
    provider: host === 'smtp.gmail.com' ? 'gmail' : 'smtp',
  };
}

function buildOtpEmailHtml({ code, recipientName, purpose, expiresInMinutes = 10 }) {
  const isSignup = purpose === 'SIGNUP';
  const actionText = isSignup ? 'complete your StockFlow registration' : 'sign in to your StockFlow workspace';
  const title = isSignup ? 'Confirm Your StockFlow Account' : 'StockFlow Security Verification Code';

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
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 36px 28px;
      box-shadow: 0 12px 30px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #334155;
    }
    .logo-badge {
      background: #10B981;
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
      background: #0F172A;
      border: 2px solid #10B981;
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
      color: #10B981;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #34D399;
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
      <div class="logo-badge">SF</div>
      <div style="margin-left: 12px;">
        <h1 class="brand-title">StockFlow</h1>
        <p class="brand-subtitle">Retail Inventory & Cashbook Platform</p>
      </div>
    </div>

    <h2>Hello ${recipientName || 'there'},</h2>
    <p>Use the 6-digit verification code below to ${actionText}:</p>

    <div class="otp-box">
      <div class="otp-label">${isSignup ? 'Registration OTP Code' : 'Sign-In OTP Code'}</div>
      <div class="otp-code">${code}</div>
      <div class="otp-hint">Expires in ${expiresInMinutes} minutes</div>
    </div>

    <p>Never share this code with anyone. StockFlow team members will never ask for your verification code.</p>

    <div class="footer">
      This automated security email was sent by StockFlow.<br>
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
  <title>Welcome to StockFlow</title>
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
    <h1>Welcome to StockFlow, ${recipientName || 'Trader'}!</h1>
    <p>Your retail inventory and cashbook workspace is now active and ready to record sales and stock movements.</p>
    <div class="card">
      <div class="row">Store / Business: <strong>${businessName || 'Retail Store'}</strong></div>
      <div class="row">Default Currency: <strong>${currency}</strong></div>
      <div class="row">Status: <strong style="color:#34D399;">Approved & Active</strong></div>
    </div>
    <p>You can now add stock, sell items from the Point of Sale counter or Inventory tab, and track all movements in your Activity History.</p>
    <div class="footer">StockFlow • Retail Inventory & Cashbook Platform</div>
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
        const fromAddress = env.EMAIL_FROM || 'StockFlow <onboarding@resend.dev>';
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
        const rawFrom = env.EMAIL_FROM || 'notifications@stockflowlagos.com';
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
      ? `${code} is your StockFlow registration code`
      : `${code} is your StockFlow sign-in code`;
    const text = `Hello ${recipientName || 'there'},\n\nYour StockFlow verification code is: ${code}\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`;
    const html = buildOtpEmailHtml({ code, recipientName, purpose });

    console.log(`[Notification:Email] Sending OTP ${code} to ${to} (${purpose})`);
    return this.deliverEmail({ to, subject, text, html });
  }

  /**
   * Send Welcome Email Notification after account creation
   */
  async sendWelcomeEmail({ to, recipientName = '', businessName = '', currency = 'NGN' }) {
    if (!to) return { success: false };
    const subject = `Welcome to StockFlow — ${businessName || 'Your Store'} is Ready!`;
    const text = `Hello ${recipientName || 'there'},\n\nWelcome to StockFlow! Your store workspace (${businessName || 'Retail Store'}) is now active with default currency ${currency}.`;
    const html = buildWelcomeEmailHtml({ recipientName, businessName, currency });

    return this.deliverEmail({ to, subject, text, html });
  }

  /**
   * Format phone number to international E.164 (e.g. 0803... -> +234803...)
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = String(phone).replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('0') && cleaned.length >= 10) {
      return `+234${cleaned.slice(1)}`;
    }
    if (cleaned.length === 10) {
      return `+234${cleaned}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Send SMS Notification with OTP
   */
  async sendSmsOtp({ phone, code, purpose = 'LOGIN' }) {
    const formattedPhone = this.formatPhoneNumber(phone);
    if (!formattedPhone) {
      throw new Error('Valid phone number required for SMS notification.');
    }

    const isSignup = purpose === 'SIGNUP';
    const message = isSignup
      ? `Your StockFlow registration code is ${code}. Valid for 10 minutes. Do not share this code.`
      : `Your StockFlow sign-in verification code is ${code}. Valid for 10 minutes. Do not share.`;

    console.log(`[Notification:SMS] Sending OTP ${code} to ${formattedPhone} (${purpose})`);

    // 1. Try Termii API (Primary for Nigeria / West Africa)
    if (env.TERMII_API_KEY) {
      try {
        const res = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formattedPhone.replace('+', ''),
            from: env.TERMII_SENDER_ID || 'StockFlow',
            sms: message,
            type: 'plain',
            channel: 'generic',
            api_key: env.TERMII_API_KEY,
          }),
        });
        const data = await res.json();
        if (res.ok && data.message_id) {
          console.log('[Notification:SMS] Delivered via Termii:', data.message_id);
          return { success: true, provider: 'termii', id: data.message_id };
        }
        console.warn('[Notification:SMS] Termii response:', data);
      } catch (err) {
        console.warn('[Notification:SMS] Termii delivery failed:', err.message);
      }
    }

    // 2. Try Twilio API
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
      try {
        const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', formattedPhone);
        params.append('From', env.TWILIO_PHONE_NUMBER);
        params.append('Body', message);

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
        const data = await res.json();
        if (res.ok && data.sid) {
          console.log('[Notification:SMS] Delivered via Twilio:', data.sid);
          return { success: true, provider: 'twilio', id: data.sid };
        }
        console.warn('[Notification:SMS] Twilio response:', data);
      } catch (err) {
        console.warn('[Notification:SMS] Twilio delivery failed:', err.message);
      }
    }

    // 3. Try Generic Webhook
    if (env.SMS_WEBHOOK_URL) {
      try {
        const res = await fetch(env.SMS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formattedPhone,
            message,
            code,
            purpose,
          }),
        });
        if (res.ok) {
          console.log('[Notification:SMS] Delivered via SMS Webhook');
          return { success: true, provider: 'webhook' };
        }
      } catch (err) {
        console.warn('[Notification:SMS] SMS Webhook delivery failed:', err.message);
      }
    }

    // 4. Fallback: Log to console
    console.log(`[Notification:SMS] (Simulated Delivery) To: ${formattedPhone} | Code: ${code} | Message: ${message}`);
    return { success: true, provider: 'console-simulated', phone: formattedPhone };
  }
}

module.exports = new NotificationService();
