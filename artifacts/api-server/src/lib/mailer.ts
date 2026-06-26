export async function sendOtpEmail(
  to: string,
  name: string,
  otp: string,
): Promise<{ sent: boolean; preview?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SMTP_USER || process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "ShopAll";

  if (!apiKey || !fromEmail) {
    // Dev fallback — log OTP to console
    console.log(`\n[MAILER DEV] OTP for ${to}: ${otp}\n`);
    return { sent: false, preview: otp };
  }

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

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to, name }],
        subject: "Your Verification Code",
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[mailer] Brevo API error:", response.status, JSON.stringify(err));
      return { sent: false };
    }

    console.log(`[mailer] OTP sent to ${to} via Brevo`);
    return { sent: true };
  } catch (err) {
    console.error("[mailer] Failed to send email:", err);
    return { sent: false };
  }
}
