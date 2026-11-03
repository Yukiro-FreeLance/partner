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

function enabled() { return process.env.OPENCODE_ENABLED === "true" && Boolean(process.env.OPENCODE_HOST); }

function client() {
  const host = process.env.OPENCODE_HOST;
  if (!host) throw new Error("OpenCode is not configured.");
  const headers: Record<string, string> = {};
  if (process.env.OPENCODE_SERVER_USERNAME && process.env.OPENCODE_SERVER_PASSWORD) headers.authorization = `Basic ${Buffer.from(`${process.env.OPENCODE_SERVER_USERNAME}:${process.env.OPENCODE_SERVER_PASSWORD}`).toString("base64")}`;
  if (process.env.OPENCODE_TOKEN) headers.authorization = `Bearer ${process.env.OPENCODE_TOKEN}`;
  return OpenCode.make({ baseUrl: host, headers });
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

export async function answer(
  repo: Repository,
  userId: string,
  conversation: AIConversation,
  text: string,
  onDelta?: (delta: string) => void,
) {
  if (!enabled()) throw new Error("CoupleSync AI is not configured. Start OpenCode and set OPENCODE_ENABLED=true and OPENCODE_HOST.");
  const settings = await getSiteSettings();
  if (!settings.aiEnabled) throw new Error("The WenX chatbot is currently disabled by the administrator.");
  const assistantName = settings.aiName?.trim() || AI_NAME;
  const clean = text.trim();
  if (!clean || clean.length > 4000) throw new Error("Message must be between 1 and 4000 characters.");
  requestLog.__coupleSyncAIRate ??= new Map();
  const recent = (requestLog.__coupleSyncAIRate.get(userId) ?? []).filter((stamp) => Date.now() - stamp < 60_000);
  if (recent.length >= 12) throw new Error("You have sent several messages quickly. Please wait a minute and try again.");
  recent.push(Date.now());
  requestLog.__coupleSyncAIRate.set(userId, recent);
  const history = await repo.list("aiMessages", { eq: { conversationId: conversation.id, userId } }, { orderBy: "createdAt", descending: true, limit: maxMessages() });
  const data = await context(repo, userId);
  const prompt = `${systemPrompt(assistantName, data)}\n\nRecent conversation:\n${history.reverse().map((message) => `${message.role}: ${message.content}`).join("\n")}\n\nUser: ${clean}`;
  const opencode = client();
  const model = settings.aiModel
    ? { providerID: settings.aiProvider ?? "opencode", id: settings.aiModel }
    : settings.aiProvider && settings.aiProvider !== "opencode"
      ? (await opencode.model.list()).data.find((candidate) => candidate.providerID === settings.aiProvider && candidate.status === "active")
      : undefined;
  if (settings.aiProvider && settings.aiProvider !== "opencode" && !model) {
    throw new Error(`No active ${settings.aiProvider} model is configured in OpenCode. Set a model ID in Super Admin → Site settings.`);
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
  const stamp = now();
  await repo.insert("aiMessages", { id: createId(), conversationId: conversation.id, userId, role: "user", content: clean, metadata: null, createdAt: stamp });
  await repo.insert("aiMessages", { id: createId(), conversationId: conversation.id, userId, role: "assistant", content: response, metadata: { provider: settings.aiProvider ?? "opencode", model: settings.aiModel || null }, createdAt: stamp });
  await repo.update("aiConversations", conversation.id, { title: conversation.title === "New conversation" ? clean.slice(0, 60) : conversation.title, updatedAt: stamp });
  return response;
}
