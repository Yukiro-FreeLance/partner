import "server-only";

import type { ExpenseCategory, PaymentMethod } from "@/lib/domain";
import { fail, ok, type Result } from "@/lib/result";

const categories = new Set<ExpenseCategory>(["flight", "accommodation", "food", "transportation", "activities", "merchandise", "shopping", "other"]);
const payments = new Set<PaymentMethod>(["cash", "card", "transfer", "ewallet", "other"]);

export type ReceiptDraft = {
  store: string;
  purchase: string;
  items: string;
  total: number | null;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod | "";
  purchasedAt: string;
};

type ProviderId = "gemini" | "openrouter" | "groq";

type VisionRoute = {
  provider: ProviderId;
  model: string;
  key: string;
};

const receiptPrompt = [
  "Read the attached receipt photo carefully.",
  "Reply with JSON only. Do not wrap it in markdown.",
  '{"store": string|null, "purchase": string, "items": [{"name": string, "amount": number|null}], "total": number|null, "category": "flight"|"accommodation"|"food"|"transportation"|"activities"|"merchandise"|"shopping"|"other", "paymentMethod": "cash"|"card"|"transfer"|"ewallet"|"other"|null, "purchasedAt": "YYYY-MM-DDTHH:mm"|null}',
  "purchase is a short name for what was bought. total is the amount paid including tax. Use null when a value is not on the receipt.",
].join("\n");

const geminiModels = (process.env.RECEIPT_GEMINI_MODELS || "gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const openRouterModels = (process.env.RECEIPT_OPENROUTER_MODELS || "openrouter/free,nvidia/nemotron-3.5-super-vl:free,google/gemma-4-31b-it:free,thinkingmachines/inkling-small:free")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const groqModels = (process.env.RECEIPT_GROQ_MODELS || "qwen/qwen3.8-27b")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export function parseReceiptText(raw: string): Result<ReceiptDraft> {
  const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return fail("The receipt could not be read. Try a clearer photo.");
  let value: unknown;
  try {
    value = JSON.parse(match[0]);
  } catch {
    return fail("The receipt could not be read. Try a clearer photo.");
  }
  if (!value || typeof value !== "object") return fail("The receipt could not be read. Try a clearer photo.");
  const row = value as Record<string, unknown>;
  const store = typeof row.store === "string" ? row.store.trim().slice(0, 120) : "";
  const purchase = typeof row.purchase === "string" ? row.purchase.trim().slice(0, 160) : "";
  const items = Array.isArray(row.items)
    ? row.items.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const line = item as Record<string, unknown>;
        const name = typeof line.name === "string" ? line.name.trim() : "";
        if (!name) return [];
        const amount = typeof line.amount === "number" && Number.isFinite(line.amount)
          ? line.amount
          : typeof line.amount === "string" && Number.isFinite(Number(line.amount))
            ? Number(line.amount)
            : null;
        return [amount == null ? name : `${name} — ${Number(amount).toFixed(2)}`];
      }).join("\n").slice(0, 1800)
    : "";
  const totalRaw = typeof row.total === "number" ? row.total : typeof row.total === "string" ? Number(row.total) : NaN;
  const total = Number.isFinite(totalRaw) && totalRaw >= 0 ? Math.round(totalRaw * 100) / 100 : null;
  const category = typeof row.category === "string" && categories.has(row.category as ExpenseCategory) ? row.category as ExpenseCategory : "other";
  const paymentMethod = typeof row.paymentMethod === "string" && payments.has(row.paymentMethod as PaymentMethod) ? row.paymentMethod as PaymentMethod : "";
  const purchasedAt = typeof row.purchasedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(row.purchasedAt) ? row.purchasedAt : "";
  if (!purchase && !store && total == null) return fail("The receipt did not include a purchase, store, or total. Try a clearer photo.");
  return ok({
    store,
    purchase: purchase || (store ? `Purchase at ${store}` : "Receipt purchase"),
    items,
    total,
    category,
    paymentMethod,
    purchasedAt,
  });
}

export async function analyzeReceipt(bytes: Buffer, mime: string): Promise<Result<ReceiptDraft>> {
  const routes = visionRoutes();
  if (!routes.length) {
    return fail("Receipt scanning needs a free vision API key. Set GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY, then try again.");
  }

  const failures: string[] = [];
  for (const route of routes) {
    try {
      const text = await askVision(route, bytes, mime);
      const parsed = parseReceiptText(text);
      if (parsed.ok) return parsed;
      failures.push(`${route.provider}/${route.model}: could not parse the model reply`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isQuotaError(message)) {
        failures.push(`${route.provider}/${route.model}: free limit or quota reached`);
        continue;
      }
      failures.push(`${route.provider}/${route.model}: ${message.slice(0, 160)}`);
    }
  }

  if (failures.every((item) => /free limit|quota/i.test(item))) {
    return fail("All free vision models are out of quota right now. Wait a bit or add another free API key, then try again.");
  }
  return fail(failures[0] || "The receipt could not be read. Try a clearer photo.");
}

function visionRoutes(): VisionRoute[] {
  const preferred = (process.env.RECEIPT_AI_PROVIDER || "").trim().toLowerCase();
  const geminiKey = firstEnv("GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY");
  const openRouterKey = firstEnv("OPENROUTER_API_KEY");
  const groqKey = firstEnv("GROQ_API_KEY");
  const routes: VisionRoute[] = [];

  const push = (provider: ProviderId, key: string | undefined, models: string[]) => {
    if (!key) return;
    for (const model of models) routes.push({ provider, model, key });
  };

  if (preferred === "gemini") push("gemini", geminiKey, geminiModels);
  else if (preferred === "openrouter") push("openrouter", openRouterKey, openRouterModels);
  else if (preferred === "groq") push("groq", groqKey, groqModels);
  else {
    push("gemini", geminiKey, geminiModels);
    push("openrouter", openRouterKey, openRouterModels);
    push("groq", groqKey, groqModels);
  }
  return routes;
}

async function askVision(route: VisionRoute, bytes: Buffer, mime: string) {
  if (route.provider === "gemini") return askGemini(route, bytes, mime);
  if (route.provider === "openrouter") return askOpenRouter(route, bytes, mime);
  return askGroq(route, bytes, mime);
}

async function askGemini(route: VisionRoute, bytes: Buffer, mime: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(route.model)}:generateContent?key=${encodeURIComponent(route.key)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: receiptPrompt },
          { inline_data: { mime_type: mime, data: bytes.toString("base64") } },
        ],
      }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string; status?: string; code?: number };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!response.ok) throw new Error(payload.error?.message || `Gemini returned ${response.status}`);
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  if (!text.trim()) throw new Error("Gemini returned an empty reply.");
  return text;
}

async function askOpenRouter(route: VisionRoute, bytes: Buffer, mime: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${route.key}`,
      "content-type": "application/json",
      "http-referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "x-title": "CoupleSync Receipt Scan",
    },
    body: JSON.stringify({
      model: route.model,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: receiptPrompt },
          { type: "image_url", image_url: { url: `data:${mime};base64,${bytes.toString("base64")}` } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };
  if (!response.ok) throw new Error(payload.error?.message || `OpenRouter returned ${response.status}`);
  const content = payload.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => (typeof part === "string" ? part : part.text || "")).join("\n")
      : "";
  if (!text.trim()) throw new Error("OpenRouter returned an empty reply.");
  return text;
}

async function askGroq(route: VisionRoute, bytes: Buffer, mime: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${route.key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: route.model,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: receiptPrompt },
          { type: "image_url", image_url: { url: `data:${mime};base64,${bytes.toString("base64")}` } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) throw new Error(payload.error?.message || `Groq returned ${response.status}`);
  const text = payload.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("Groq returned an empty reply.");
  return text;
}

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function isQuotaError(message: string) {
  return /quota|rate.?limit|free limit|RESOURCE_EXHAUSTED|insufficient.?credits|too many requests|429/i.test(message);
}
