import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback: use Ethereal (test account) in dev
  return null;
}

const transport = createTransport();

export async function sendOtpEmail(to: string, name: string, otp: string): Promise<{ sent: boolean; preview?: string }> {
  const subject = "Your Verification Code";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#2563eb;margin-bottom:8px">Email Verification</h2>
      <p style="color:#374151">Hi <strong>${name}</strong>,</p>
      <p style="color:#374151">Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1f2937">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  if (transport) {
    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@shopall.com";
      await transport.sendMail({ from, to, subject, html });
      return { sent: true };
    } catch (err) {
      console.error("[mailer] Failed to send email:", err);
      return { sent: false };
    }
  }

  // Dev fallback — log to console
  console.log(`\n[MAILER DEV] OTP for ${to}: ${otp}\n`);
  return { sent: false, preview: otp };
}
