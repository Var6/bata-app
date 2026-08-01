const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } =
  process.env;

export function emailConfigured(): boolean {
  return Boolean(
    EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && EMAILJS_PRIVATE_KEY
  );
}

/**
 * Send an email through the EmailJS REST API.
 * The EmailJS template must use: {{to_email}}, {{to_name}}, {{subject}}, {{message}}.
 */
export async function sendEmail(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) {
    return { ok: false, error: "EmailJS is not configured (see .env.example)" };
  }
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: opts.toEmail,
          to_name: opts.toName,
          subject: opts.subject,
          message: opts.message,
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `EmailJS error ${res.status}: ${await res.text()}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email" };
  }
}
