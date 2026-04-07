// services/emailService.js — Email notifications
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  // Use real SMTP if configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: log emails to console
    console.log('⚠️  Email: No SMTP configured — emails will be logged to console');
    transporter = {
      sendMail: async (opts) => {
        console.log('\n📧 [DEV EMAIL]\nTo:', opts.to, '\nSubject:', opts.subject, '\nOTP/Content:', opts.text || opts.html?.slice(0, 200));
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }

  return transporter;
}

const EMAIL_TEMPLATE = (content) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:'DM Sans',Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:520px;margin:40px auto;background:#0a0a0f;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6c63ff,#2dd4bf);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">CareerPulse ⚡</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Career Intelligence Hub</p>
    </div>
    <div style="padding:32px;color:#f0f0f8;">
      ${content}
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
      <p style="color:#8888aa;font-size:12px;margin:0;">© 2024 CareerPulse · <a href="#" style="color:#6c63ff;text-decoration:none;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`;

async function sendOTP(email, name, otp) {
  const html = EMAIL_TEMPLATE(`
    <h2 style="margin:0 0 16px;font-size:20px;">Verify your email 🔐</h2>
    <p style="color:#8888aa;line-height:1.7;margin:0 0 24px;">Hi ${name}, use the code below to verify your CareerPulse account. It expires in 15 minutes.</p>
    <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#6c63ff;">${otp}</div>
    </div>
    <p style="color:#8888aa;font-size:13px;margin:0;">If you didn't create a CareerPulse account, you can safely ignore this email.</p>
  `);

  await getTransporter().sendMail({
    from: `"${process.env.FROM_NAME || 'CareerPulse'}" <${process.env.FROM_EMAIL || 'noreply@careerpulse.app'}>`,
    to: email,
    subject: `${otp} — Your CareerPulse verification code`,
    text: `Your CareerPulse OTP is: ${otp} (expires in 15 minutes)`,
    html,
  });
}

async function sendJobAlert(email, name, alertName, jobs) {
  const jobList = jobs.slice(0, 5).map(j => `
    <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;margin-bottom:12px;">
      <p style="margin:0 0 4px;font-weight:600;font-size:15px;">${j.title}</p>
      <p style="margin:0 0 8px;color:#8888aa;font-size:13px;">${j.company} · ${j.location} · ${j.work_mode}</p>
      <a href="${j.url || '#'}" style="background:#6c63ff;color:#fff;text-decoration:none;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;">View Job →</a>
    </div>
  `).join('');

  const html = EMAIL_TEMPLATE(`
    <h2 style="margin:0 0 8px;font-size:20px;">🔔 New jobs for "${alertName}"</h2>
    <p style="color:#8888aa;line-height:1.7;margin:0 0 24px;">Hi ${name}, we found ${jobs.length} new jobs matching your alert. Here are the top picks:</p>
    ${jobList}
    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs" style="display:block;background:linear-gradient(135deg,#6c63ff,#2dd4bf);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:600;margin-top:16px;">View All Jobs on CareerPulse →</a>
  `);

  await getTransporter().sendMail({
    from: `"${process.env.FROM_NAME || 'CareerPulse'}" <${process.env.FROM_EMAIL || 'noreply@careerpulse.app'}>`,
    to: email,
    subject: `🔔 ${jobs.length} new jobs matching "${alertName}"`,
    html,
  });
}

async function sendWelcome(email, name) {
  const html = EMAIL_TEMPLATE(`
    <h2 style="margin:0 0 16px;font-size:20px;">Welcome to CareerPulse! 🚀</h2>
    <p style="color:#8888aa;line-height:1.7;margin:0 0 24px;">Hi ${name}, your account is ready. Here's what you can do right away:</p>
    <div style="margin-bottom:24px;">
      <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:12px;"><span style="font-size:20px;">🧠</span><div><p style="margin:0;font-weight:500;">Analyze your LinkedIn profile</p><p style="margin:0;color:#8888aa;font-size:13px;">Get AI-powered suggestions to improve visibility</p></div></div>
      <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);"><span style="font-size:20px;">🔍</span><span style="margin-left:12px;font-weight:500;">Browse jobs from all major portals in one place</span></div>
      <div style="padding:12px 0;"><span style="font-size:20px;">🔔</span><span style="margin-left:12px;font-weight:500;">Set up job alerts to get notified instantly</span></div>
    </div>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display:block;background:linear-gradient(135deg,#6c63ff,#2dd4bf);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:600;">Open CareerPulse →</a>
  `);

  await getTransporter().sendMail({
    from: `"${process.env.FROM_NAME || 'CareerPulse'}" <${process.env.FROM_EMAIL || 'noreply@careerpulse.app'}>`,
    to: email,
    subject: `Welcome to CareerPulse, ${name}! ⚡`,
    html,
  });
}

module.exports = { sendOTP, sendJobAlert, sendWelcome };
