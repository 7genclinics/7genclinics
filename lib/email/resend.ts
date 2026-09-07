import { BRAND } from "@/lib/brand/site";

export function appPublicUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://apnaclinic.pk").replace(/\/$/, "");
}

/**
 * Resend "from" must be a verified domain (or onboarding@resend.dev for tests).
 * Gmail addresses like 7genclinics@gmail.com cannot be used as From — use reply_to instead.
 */
export function resendFromAddress() {
  return process.env.RESEND_FROM ?? "Apna Clinic <onboarding@resend.dev>";
}

export function resendReplyTo() {
  return process.env.RESEND_REPLY_TO ?? BRAND.supportEmail;
}

export function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromAddress(),
      to: [input.to],
      reply_to: resendReplyTo(),
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    return { sent: false, reason: await res.text() };
  }

  return { sent: true };
}

export function brandedEmailHtml(title: string, innerHtml: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#0d9488,#0284c7);padding:28px 32px">
        <p style="margin:0;color:#fff;font-size:13px;letter-spacing:.12em;text-transform:uppercase">${escapeEmailHtml(BRAND.name)}</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:22px">${escapeEmailHtml(title)}</h1>
      </div>
      <div style="padding:28px 32px;color:#334155;line-height:1.6">
        ${innerHtml}
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">${escapeEmailHtml(BRAND.name)}</p>
      </div>
    </div>
  `;
}
