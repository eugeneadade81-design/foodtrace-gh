import nodemailer from 'nodemailer';

// Create transporter — replace with real SMTP credentials in .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email is optional: without SMTP configured (local/dev) we log instead of
// sending, and a send failure never breaks the caller (e.g. registration). This
// fixes the 500 that made register fail whenever no SMTP server was available.
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

async function deliver(mail, fallbackLog) {
  if (!smtpConfigured) {
    console.log(`[email disabled — no SMTP] ${fallbackLog}`);
    return;
  }
  try {
    await transporter.sendMail(mail);
  } catch (err) {
    console.warn(`[email send failed, continuing] ${err.message} :: ${fallbackLog}`);
  }
}

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send an OTP email to a manufacturer
 */
export const sendOTPEmail = async (toEmail, otp, purpose = 'verify') => {
  const subject =
    purpose === 'register'
      ? 'FoodTrace GH — Verify your account'
      : 'FoodTrace GH — Login OTP';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:8px;">
      <h2 style="color:#2d6a4f;margin-bottom:8px;">FoodTrace GH</h2>
      <p style="color:#4a5568;margin-bottom:24px;">
        ${purpose === 'register' ? 'Welcome! Please verify your email address.' : 'Use the code below to log in.'}
      </p>
      <div style="background:#f0fff4;border:2px solid #2d6a4f;border-radius:8px;padding:24px;text-align:center;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a202c;">${otp}</span>
      </div>
      <p style="color:#718096;font-size:14px;margin-top:16px;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#718096;font-size:12px;margin-top:24px;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  await deliver(
    {
      from: `"FoodTrace GH" <${process.env.EMAIL_FROM}>`,
      to: toEmail,
      subject,
      html,
    },
    `OTP for ${toEmail} (${purpose}): ${otp}`
  );
};

/**
 * Send a recall alert email
 */
export const sendRecallEmail = async (toEmail, batchInfo, recallReason, safeDisposal) => {
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;border:2px solid #e53e3e;border-radius:8px;">
      <h2 style="color:#e53e3e;">⚠️ PRODUCT RECALL ALERT</h2>
      <p style="margin-top:16px;">A product you previously scanned has been recalled.</p>
      <table style="width:100%;margin-top:16px;border-collapse:collapse;">
        <tr><td style="padding:8px;background:#fff5f5;font-weight:bold;">Product</td><td style="padding:8px;">${batchInfo.product_name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Batch No.</td><td style="padding:8px;">${batchInfo.batch_number}</td></tr>
        <tr><td style="padding:8px;background:#fff5f5;font-weight:bold;">Recall Reason</td><td style="padding:8px;">${recallReason}</td></tr>
      </table>
      ${safeDisposal ? `<p style="margin-top:16px;"><strong>Safe disposal:</strong> ${safeDisposal}</p>` : ''}
      <p style="margin-top:24px;color:#718096;font-size:13px;">Do not consume this product. Please dispose of it safely.</p>
    </div>
  `;

  await deliver(
    {
      from: `"FoodTrace GH" <${process.env.EMAIL_FROM}>`,
      to: toEmail,
      subject: `🚨 RECALL: ${batchInfo.product_name} (Batch ${batchInfo.batch_number})`,
      html,
    },
    `Recall alert for ${toEmail}: ${batchInfo.product_name} batch ${batchInfo.batch_number}`
  );
};
