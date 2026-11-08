import "server-only";
import { OpenCode } from "@opencode/client";
import type { AIConversation, AIMessage } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { createId } from "@/lib/ids";
import { activeMembership } from "@/lib/services/access";
import { journalData } from "@/lib/services/journal";
import { visibleMemories } from "@/lib/services/life";
import { getSiteSettings } from "@/lib/site-settings";

const now = () => new Date().toISOString();
const maxMessages = () => Math.max(4, Number(process.env.AI_MAX_CONTEXT_MESSAGES || 20));
const requestLog = globalThis as { __coupleSyncAIRate?: Map<string, number[]> };

export const AI_NAME = "WenX";
export const AI_WELCOME = "Hi! I'm WenX, your CoupleSync relationship companion. ❤️\n\nI'm here to help you discover meaningful experiences, reflect on your memories, plan special dates, and make every moment together more memorable.\n\nWhat would you like to talk about today?";

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
}

function opencodeEnabled() {
  return process.env.OPENCODE_ENABLED === "true" && Boolean(process.env.OPENCODE_HOST);
}

function geminiApiKey() {
  return firstEnv("GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY");
}

/** Gemini 2.5 Flash is closed to new Google AI users; map it to the current Flash default. */
function normalizeGeminiModel(modelId: string) {
  const raw = modelId.trim().replace(/^models\//, "");
  if (!raw || raw === "gemini-2.5-flash") return "gemini-3.8-flash";
  return raw;
}

const defaultGeminiFallbacks = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

/** Preferred model first, then lighter Flash models when Google returns capacity/quota errors. */
function geminiModelCandidates(preferred: string) {
  const fromEnv = (process.env.AI_GEMINI_MODELS || "")
    .split(",")
    .map((item) => normalizeGeminiModel(item))
    .filter(Boolean);
  const ordered = [normalizeGeminiModel(preferred), ...fromEnv, ...defaultGeminiFallbacks];
  return [...new Set(ordered)];
}

function isGeminiCapacityError(message: string) {
  return /high demand|try again later|capacity|overloaded|unavailable|RESOURCE_EXHAUSTED|quota|rate.?limit|too many requests|429|503|UNAVAILABLE/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when WenX can answer: OpenCode is up, or a Gemini API key is present for direct Google mode. */
export function aiRuntimeConfigured() {
  return opencodeEnabled() || Boolean(geminiApiKey());
}

function client() {
  const host = process.env.OPENCODE_HOST;
  if (!host) throw new Error("OpenCode is not configured.");
  const headers: Record<string, string> = {};
  if (process.env.OPENCODE_SERVER_USERNAME && process.env.OPENCODE_SERVER_PASSWORD) headers.authorization = `Basic ${Buffer.from(`${process.env.OPENCODE_SERVER_USERNAME}:${process.env.OPENCODE_SERVER_PASSWORD}`).toString("base64")}`;
  if (process.env.OPENCODE_TOKEN) headers.authorization = `Bearer ${process.env.OPENCODE_TOKEN}`;
  return OpenCode.make({ baseUrl: host, headers });
}

/** Marker label so the site settings UI only manages the credentials it created itself. */
export const managedKeyLabel = (providerId: string) => `CoupleSync · ${providerId}`;

const providerIdPattern = /^[a-z0-9][a-z0-9._-]{1,60}$/i;

export type ProviderKey = { id: string; integrationId: string; type: "key" | "oauth" | "external"; label: string; active: boolean };

/** All credentials OpenCode holds for the given providers (used by the settings page status row). */
export async function providerCredentials(providerIds: string[]): Promise<ProviderKey[]> {
  if (opencodeEnabled()) {
    const opencode = client();
    const credentials = ((await opencode.credential.list().catch(() => [])) || []).filter((credential) => providerIds.includes(credential.integrationID));
    return credentials.map((credential) => ({
      id: credential.id,
      integrationId: credential.integrationID,
      type: credential.value.type,
      label: credential.label,
      active: credential.active,
    }));
  }
  if (providerIds.includes("google") && geminiApiKey()) {
    return [{ id: "env-gemini", integrationId: "google", type: "key", label: "Server GEMINI_API_KEY", active: true }];
  }
  return [];
}

/** Stores an API key for a provider on the OpenCode server, replacing the key this app manages for it. */
export async function connectProviderKey(providerId: string, key: string): Promise<{ ok: boolean; error?: string }> {
  if (!opencodeEnabled()) {
    if (providerId === "google") {
      return { ok: false, error: "OpenCode is not running. Set GEMINI_API_KEY in the server environment instead of pasting a key here." };
    }
    return { ok: false, error: "OpenCode is not configured on this server." };
  }
  if (!providerIdPattern.test(providerId)) return { ok: false, error: `“${providerId}” is not a valid provider ID.` };
  if (!key) return { ok: false, error: "Enter the API key to add." };
  const opencode = client();
  try {
    const integration = ((await opencode.integration.list()).data ?? []).find((item) => item.id === providerId);
    if (!integration) return { ok: false, error: `OpenCode does not know a provider called “${providerId}”.` };
    if (!integration.methods.some((method) => method.type === "key")) {
      return { ok: false, error: `“${integration.name ?? providerId}” does not accept an API key${integration.methods.length ? ` (its methods: ${integration.methods.map((method) => method.type).join(", ")})` : ""}.` };
    }
    const managedLabel = managedKeyLabel(providerId);
    // Ids of keys this app stored earlier — they become stale the moment the new key is connected.
    const knownKeyIds = (((await opencode.credential.list().catch(() => [])) || []).filter((credential) => credential.integrationID === providerId && credential.value.type === "key" && credential.label === managedLabel).map((credential) => credential.id));
    await opencode.integration.connect.key({ integrationID: providerId, key, label: managedLabel });
    // One key per provider: remove the earlier ones (the just-connected id is never in this list).
    for (const credentialID of knownKeyIds) {
      await opencode.credential.remove({ credentialID }).catch(() => undefined);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The API key could not be added to OpenCode." };
  }
}

/** Removes only the API keys this app added for a provider (OAuth or manual keys it did not create stay). */
export async function disconnectProviderKey(providerId: string): Promise<{ ok: boolean; error?: string }> {
  if (!opencodeEnabled()) {
    if (providerId === "google") {
      return { ok: false, error: "Google Gemini uses GEMINI_API_KEY from the server environment. Remove it there to disconnect." };
    }
    return { ok: false, error: "OpenCode is not configured on this server." };
  }
  if (!providerIdPattern.test(providerId)) return { ok: false, error: `“${providerId}” is not a valid provider ID.` };
  const opencode = client();
  try {
    const managed = ((await opencode.credential.list().catch(() => [])) || []).filter((credential) => credential.integrationID === providerId && credential.value.type === "key" && credential.label === managedKeyLabel(providerId));
    for (const credential of managed) {
      try {
        await opencode.credential.remove({ credentialID: credential.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        if (!/404|not found/i.test(message)) throw error;
      }
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The stored API key could not be removed." };
  }
}

export async function listConversations(repo: Repository, userId: string) { return repo.list("aiConversations", { eq: { userId } }, { orderBy: "updatedAt", descending: true }); }

export async function getConversation(repo: Repository, userId: string, id: string) {
  const conversation = await repo.find("aiConversations", { eq: { id, userId } });
  if (!conversation) return null;
  const messages = await repo.list("aiMessages", { eq: { conversationId: id, userId } }, { orderBy: "createdAt" });
  return { conversation, messages };
}

export async function createConversation(repo: Repository, userId: string, title = "New conversation") {
  const membership = await activeMembership(repo, userId);
  const stamp = now();
  return repo.insert("aiConversations", { id: createId(), userId, coupleId: membership?.coupleId ?? null, title: title.trim().slice(0, 80) || "New conversation", opencodeSessionId: null, createdAt: stamp, updatedAt: stamp });
}

export async function deleteConversation(repo: Repository, userId: string, id: string) {
  const conversation = await repo.find("aiConversations", { eq: { id, userId } });
  if (!conversation) return false;
  await repo.remove("aiConversations", id);
  return true;
}

export async function clearConversation(repo: Repository, userId: string, id: string) {
  const conversation = await repo.find("aiConversations", { eq: { id, userId } });
  if (!conversation) return false;
  await repo.removeWhere("aiMessages", { eq: { conversationId: id, userId } });
  await repo.update("aiConversations", id, { updatedAt: now() });
  return true;
}

async function context(repo: Repository, userId: string) {
  const membership = await activeMembership(repo, userId);
  const [profile, journal, memories, plans] = await Promise.all([
    repo.find("profiles", { eq: { id: userId } }),
    journalData(repo, userId),
    visibleMemories(repo, userId),
    repo.list("datePlans", membership ? { eq: { coupleId: membership.coupleId } } : {}),
  ]);
  return {
    user: profile ? { name: profile.displayName, interests: profile.interests, preferredCategories: profile.preferredCategories } : null,
    relationship: membership ? { coupleId: membership.coupleId } : null,
    movies: journal.available ? journal.movies.map(({ id, userId: _owner, ...movie }) => ({ id, ...movie })) : [],
    places: journal.available ? journal.places.map(({ id, userId: _owner, ...place }) => ({ id, ...place })) : [],
    reflections: journal.available ? journal.reflections.map(({ id, userId: _owner, ...reflection }) => ({ id, ...reflection })) : [],
    memories: memories.map(({ id, authorId: _author, coupleId: _couple, ...memory }) => ({ id, ...memory })),
    datePlans: plans.map(({ id, coupleId: _couple, ...plan }) => ({ id, ...plan })),
  };
}

function systemPrompt(name: string, data: unknown) {
  return `You are ${name}, a warm and emotionally intelligent relationship companion. You are not a therapist or licensed professional. Be supportive, practical, non-judgmental, and concise. Never invent memories, dates, ratings, places, or preferences: use only the CoupleSync context below and say when something is not recorded. Do not expose private implementation details, credentials, or raw identifiers. Do not modify records. For abuse, threats, self-harm, or crisis situations, prioritize immediate safety and recommend trusted people, local emergency services, or qualified professionals.\n\nAuthorized CoupleSync context (may be empty):\n${JSON.stringify(data)}`;
}

function enforceRateLimit(userId: string) {
  requestLog.__coupleSyncAIRate ??= new Map();
  const recent = (requestLog.__coupleSyncAIRate.get(userId) ?? []).filter((stamp) => Date.now() - stamp < 60_000);
  if (recent.length >= 12) throw new Error("You have sent several messages quickly. Please wait a minute and try again.");
  recent.push(Date.now());
  requestLog.__coupleSyncAIRate.set(userId, recent);
}

async function persistTurn(
  repo: Repository,
  conversation: AIConversation,
  userId: string,
  clean: string,
  response: string,
  provider: string,
  model: string | null,
) {
  const stamp = now();
  await repo.insert("aiMessages", { id: createId(), conversationId: conversation.id, userId, role: "user", content: clean, metadata: null, createdAt: stamp });
  await repo.insert("aiMessages", { id: createId(), conversationId: conversation.id, userId, role: "assistant", content: response, metadata: { provider, model }, createdAt: stamp });
  await repo.update("aiConversations", conversation.id, { title: conversation.title === "New conversation" ? clean.slice(0, 60) : conversation.title, updatedAt: stamp });
}

async function streamGeminiReply(
  key: string,
  model: string,
  assistantName: string,
  data: unknown,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  onDelta?: (delta: string) => void,
) {
  const timeout = Number(process.env.AI_TIMEOUT_MS || 45_000);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(assistantName, data) }] },
      contents,
      generationConfig: { temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(payload.error?.message || `Gemini returned ${response.status}`);
  }
  if (!response.body) throw new Error("Gemini returned an empty stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const streamed: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n");
    buffer = chunks.pop() ?? "";
    for (const line of chunks) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const raw = trimmed.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const event = JSON.parse(raw) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
        if (event.error?.message) throw new Error(event.error.message);
        const delta = event.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
        if (!delta) continue;
        streamed.push(delta);
        onDelta?.(delta);
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }
  const text = streamed.join("").trim() || "I’m sorry, I couldn’t form a response just now.";
  if (!streamed.length) onDelta?.(text);
  return text;
}

async function answerWithGemini(
  repo: Repository,
  userId: string,
  conversation: AIConversation,
  clean: string,
  assistantName: string,
  modelId: string,
  history: AIMessage[],
  data: unknown,
  onDelta?: (delta: string) => void,
) {
  const key = geminiApiKey();
  if (!key) throw new Error("Set GEMINI_API_KEY in the server environment to use Google Gemini without OpenCode.");
  const contents = [
    ...history
      .slice()
      .reverse()
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
    { role: "user", parts: [{ text: clean }] },
  ];
  const candidates = geminiModelCandidates(modelId);
  let lastError = "Gemini is busy right now. Please try again in a moment.";
  let started = false;
  const trackDelta = (delta: string) => {
    started = true;
    onDelta?.(delta);
  };
  for (let index = 0; index < candidates.length; index += 1) {
    const model = candidates[index];
    // One short retry on the preferred model when Google reports temporary high demand.
    const attempts = index === 0 ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const text = await streamGeminiReply(key, model, assistantName, data, contents, trackDelta);
        await persistTurn(repo, conversation, userId, clean, text, "google", model);
        return text;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastError = message;
        // Once tokens reached the UI, do not switch models mid-reply.
        if (started || !isGeminiCapacityError(message)) throw error instanceof Error ? error : new Error(message);
        if (attempt + 1 < attempts) {
          await sleep(800);
          continue;
        }
      }
    }
  }
  throw new Error(/high demand|try again later|overloaded|capacity/i.test(lastError)
    ? "Gemini is under high demand right now. WenX tried backup models too — please retry in a minute."
    : lastError);
}

async function answerWithOpenCode(
  repo: Repository,
  userId: string,
  conversation: AIConversation,
  clean: string,
  assistantName: string,
  providerID: string,
  modelId: string,
  history: AIMessage[],
  data: unknown,
  onDelta?: (delta: string) => void,
) {
  const prompt = `${systemPrompt(assistantName, data)}\n\nRecent conversation:\n${history.reverse().map((message) => `${message.role}: ${message.content}`).join("\n")}\n\nUser: ${clean}`;
  const opencode = client();
  const model = modelId
    ? { providerID, id: modelId }
    : providerID !== "opencode"
      ? (await opencode.model.list()).data.find((candidate) => candidate.providerID === providerID && candidate.status === "active")
      : undefined;
  if (providerID !== "opencode" && !model) {
    throw new Error(`No active ${providerID} model is configured in OpenCode. Add the provider's API key and a model ID in Super Admin → Site settings.`);
  }
  let sessionId = conversation.opencodeSessionId;
  if (!sessionId) {
    const session = await opencode.session.create({ title: assistantName, model: model ? { providerID: model.providerID, id: "modelID" in model ? model.modelID : model.id } : undefined, permissions: [{ action: "*", resource: "*", effect: "deny" }] }, { signal: AbortSignal.timeout(10_000) });
    sessionId = session.id;
    await repo.update("aiConversations", conversation.id, { opencodeSessionId: sessionId });
  }
  const eventsController = new AbortController();
  const timeout = Number(process.env.AI_TIMEOUT_MS || 45_000);
  const eventStream = opencode.event.subscribe({ types: ["session.text.delta"], signal: eventsController.signal });
  const streamed: string[] = [];
  const eventTask = (async () => {
    for await (const event of eventStream) {
      if (event.type !== "session.text.delta" || event.data.sessionID !== sessionId) continue;
      streamed.push(event.data.delta);
      onDelta?.(event.data.delta);
    }
  })().catch(() => undefined);
  let result;
  try {
    result = await opencode.session.generate({ sessionID: sessionId, prompt }, { signal: AbortSignal.timeout(timeout) });
  } finally {
    eventsController.abort();
    await eventTask;
  }
  const response = result.text.trim() || streamed.join("").trim() || "I’m sorry, I couldn’t form a response just now.";
  if (!streamed.length && response) onDelta?.(response);
  await persistTurn(repo, conversation, userId, clean, response, providerID, modelId || null);
  return response;
}

export async function answer(
  repo: Repository,
  userId: string,
  conversation: AIConversation,
  text: string,
  onDelta?: (delta: string) => void,
) {
  const settings = await getSiteSettings();
  if (!settings.aiEnabled) throw new Error("The WenX chatbot is currently disabled by the administrator.");
  const assistantName = settings.aiName?.trim() || AI_NAME;
  // "custom" points at any provider known to OpenCode, e.g. "deepseek" — set its ID in Site settings.
  const providerID = settings.aiProvider === "custom" ? (settings.aiCustomProvider?.trim().toLowerCase() || "custom") : settings.aiProvider ?? "google";
  const clean = text.trim();
  if (!clean || clean.length > 4000) throw new Error("Message must be between 1 and 4000 characters.");
  enforceRateLimit(userId);
  const history = await repo.list("aiMessages", { eq: { conversationId: conversation.id, userId } }, { orderBy: "createdAt", descending: true, limit: maxMessages() });
  const data = await context(repo, userId);
  const modelId = providerID === "google" ? normalizeGeminiModel(settings.aiModel ?? "") : (settings.aiModel?.trim() || "");

  if (opencodeEnabled()) {
    try {
      return await answerWithOpenCode(repo, userId, conversation, clean, assistantName, providerID, modelId, history, data, onDelta);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // When OpenCode's Google route is capacity-limited, fall through to direct Gemini with model backups.
      if (!(providerID === "google" && geminiApiKey() && isGeminiCapacityError(message))) throw error;
    }
  }
  if (providerID === "google" && geminiApiKey()) {
    return answerWithGemini(repo, userId, conversation, clean, assistantName, modelId, history, data, onDelta);
  }
  if (providerID === "google") {
    throw new Error("CoupleSync AI is not configured. Set GEMINI_API_KEY in the server environment, or start OpenCode with OPENCODE_ENABLED=true and OPENCODE_HOST.");
  }
  throw new Error("CoupleSync AI is not configured. Start OpenCode and set OPENCODE_ENABLED=true and OPENCODE_HOST.");
}
