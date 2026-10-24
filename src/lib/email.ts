import "server-only";
import { siteUrl } from "@/lib/config";

export function resendApiKey() {
  const key = process.env.RESEND_API_KEY?.trim() ?? "";
  return key.startsWith("re_") ? key : "";
}

export function isMailConfigured() {
  return Boolean(resendApiKey());
}

export function mailFrom() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  return "wendevNoReply <noreply@wendev.site>";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

const brandHost = "https://sync.wendev.site";

function renderEmail(input: { heading: string; body: string; url: string; action: string; note: string }) {
  const heading = escapeHtml(input.heading);
  const body = escapeHtml(input.body);
  const url = escapeHtml(input.url);
  const action = escapeHtml(input.action);
  const note = escapeHtml(input.note);
  const logo = `${brandHost}/brand/logo.jpg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#fbf7fc;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${body}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7fc;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:28px;overflow:hidden;">
          <tr>
            <td style="background:#4c1d95;background-image:linear-gradient(135deg,#4c1d95 0%,#7c3aed 55%,#e879f9 100%);padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:14px;vertical-align:middle;">
                    <img src="${logo}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;border-radius:16px;border:0;">
                  </td>
                  <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#ffffff;">CoupleSync</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;font-family:Arial,Helvetica,sans-serif;color:#2e2440;">
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;font-weight:700;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#5b5168;">${body}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:#6d28d9;">
                    <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${action}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#8a7f96;">Or copy this link:<br><a href="${url}" style="color:#6d28d9;word-break:break-all;">${url}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#8a7f96;">
              ${note}<br>sync.wendev.site
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendAppEmail(input: { to: string; subject: string; text: string; html: string }) {
  const key = resendApiKey();
  const to = input.to.trim().toLowerCase();
  if (!key || !to || to.endsWith(".local")) return { ok: false as const, reason: "unconfigured" as const };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: mailFrom(), to: [to], subject: input.subject, html: input.html, text: input.text }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend rejected the message", response.status, detail.slice(0, 300));
      const testing = detail.includes("testing emails");
      return { ok: false as const, reason: testing ? ("testing" as const) : ("failed" as const) };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("Resend request failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false as const, reason: "failed" as const };
  }
}

export async function sendAuthLink(input: { to: string; subject: string; intro: string; path: string }) {
  const url = `${siteUrl()}${input.path}`;
  const reset = /reset/i.test(input.subject);
  return sendAppEmail({
    to: input.to,
    subject: input.subject,
    text: `${input.intro}\n\n${url}\n\nIf you did not ask for this, you can ignore this email.`,
    html: renderEmail({
      heading: reset ? "Reset your password" : "Confirm your email",
      body: input.intro,
      url,
      action: reset ? "Choose a new password" : "Confirm email",
      note: "If you did not ask for this, you can ignore this email.",
    }),
  });
}

export async function sendNotice(input: { to: string; subject: string; body: string; href?: string | null }) {
  const url = input.href ? `${siteUrl()}${input.href}` : siteUrl();
  return sendAppEmail({
    to: input.to,
    subject: input.subject,
    text: `${input.body}\n\n${url}\n\nThis email does not include quiz answers.`,
    html: renderEmail({
      heading: input.subject,
      body: input.body,
      url,
      action: "Open CoupleSync",
      note: "This email does not include quiz answers.",
    }),
  });
}
