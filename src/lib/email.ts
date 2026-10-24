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
  return "wendevNoReply <onboarding@resend.dev>";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
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
      return { ok: false as const, reason: "failed" as const };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("Resend request failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false as const, reason: "failed" as const };
  }
}

export async function sendAuthLink(input: { to: string; subject: string; intro: string; path: string }) {
  const url = `${siteUrl()}${input.path}`;
  return sendAppEmail({
    to: input.to,
    subject: input.subject,
    text: `${input.intro}\n\n${url}\n\nIf you did not ask for this, you can ignore this email.`,
    html: `<p>${escapeHtml(input.intro)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p><p>If you did not ask for this, you can ignore this email.</p>`,
  });
}

export async function sendNotice(input: { to: string; subject: string; body: string; href?: string | null }) {
  const url = input.href ? `${siteUrl()}${input.href}` : siteUrl();
  return sendAppEmail({
    to: input.to,
    subject: input.subject,
    text: `${input.body}\n\n${url}\n\nThis email does not include quiz answers.`,
    html: `<p>${escapeHtml(input.body)}</p><p><a href="${escapeHtml(url)}">Open CoupleSync</a></p><p>This email does not include quiz answers.</p>`,
  });
}
