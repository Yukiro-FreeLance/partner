"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Copy, Heart, Loader2, MessageCircle, RefreshCw, Send, Trash2, X } from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type Conversation = { id: string; title: string };
const prompts = ["Tell me something about our relationship.", "What should we watch together?", "Suggest our next date destination.", "Give us a meaningful conversation starter.", "Explore our shared memories.", "Help plan our next anniversary."];

export function AIChatbot({ name = "WenX" }: { name?: string }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!open || conversation) return; void (async () => { const response = await fetch("/api/ai/conversations"); if (!response.ok) return; const body = await response.json() as { conversations: Conversation[] }; const found = body.conversations[0] ?? (await (await fetch("/api/ai/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "New conversation" }) })).json()).conversation; setConversation(found); const history = await fetch(`/api/ai/conversations/${found.id}`); if (history.ok) setMessages((await history.json()).messages ?? []); })(); }, [open, conversation]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(message = value) {
    const text = message.trim();
    if (!text || !conversation || busy) return;
    setValue(""); setError(""); setBusy(true);
    const userMessage: Message = { id: `local-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, userMessage, { id: `pending-${Date.now()}`, role: "assistant", content: "", createdAt: new Date().toISOString() }]);
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: conversation.id, message: text }) });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "AI service unavailable.");
      const reader = response.body?.getReader(); if (!reader) throw new Error("No response stream."); const decoder = new TextDecoder(); let buffer = ""; let answer = "";
      while (true) { const chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true }); for (const line of buffer.split("\n\n")) { if (!line.startsWith("data: ")) continue; if (line.includes("[DONE]")) continue; const data = JSON.parse(line.slice(6)) as { delta?: string; error?: string }; if (data.error) throw new Error(data.error); answer += data.delta ?? ""; setMessages((current) => current.map((item) => item.id.startsWith("pending-") ? { ...item, content: answer } : item)); } buffer = buffer.slice(buffer.lastIndexOf("\n\n") + 2); }
    } catch (caught) { setMessages((current) => current.filter((item) => !item.id.startsWith("pending-"))); setError(caught instanceof Error ? caught.message : "AI service unavailable."); } finally { setBusy(false); }
  }

  async function clear() { if (!conversation) return; await fetch(`/api/ai/conversations/${conversation.id}/messages`, { method: "DELETE" }); setMessages([]); }
  return <><button type="button" onClick={() => setOpen(true)} className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl lg:right-7 lg:bottom-7" aria-label={`Open ${name}`}><MessageCircle className="size-6" /></button>{open && <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/20 p-0 sm:p-5"><section className="flex h-[min(720px,100dvh)] w-full flex-col overflow-hidden bg-card shadow-2xl sm:h-[min(720px,calc(100dvh-2.5rem))] sm:max-w-md sm:rounded-[1.75rem]"><header className="flex items-center justify-between bg-primary px-4 py-4 text-primary-foreground"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-white/15"><Heart className="size-5" /></span><div><p className="font-semibold">{name}</p><p className="text-xs opacity-80">Your relationship companion</p></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X /></button></header><div className="flex-1 space-y-3 overflow-y-auto p-4">{!messages.length && <div className="space-y-4"><div className="rounded-2xl bg-secondary p-4 text-sm leading-6">Hi! I'm {name}, your CoupleSync relationship companion. ❤️<br /><br />I'm here to help you discover meaningful experiences, reflect on your memories, plan special dates, and make every moment together more memorable.<br /><br />What would you like to talk about today?</div><div className="grid gap-2">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)} className="rounded-xl border p-3 text-left text-xs hover:bg-secondary">{prompt}</button>)}</div></div>}{messages.map((message) => <div key={message.id} className={`group flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{message.content || <Loader2 className="size-4 animate-spin" />}</div>{message.role === "assistant" && message.content && <button type="button" className="self-end opacity-60" aria-label="Copy response" onClick={() => void navigator.clipboard.writeText(message.content)}><Copy className="size-3" /></button>}</div>)}<div ref={end} />{error && <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{error}<button type="button" className="ml-2 underline" onClick={() => void send()}>Retry</button></div>}</div><footer className="border-t p-3"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{busy ? "Thinking…" : "Your data stays in CoupleSync."}</span><button type="button" className="flex items-center gap-1 underline" onClick={() => void clear()}><Trash2 className="size-3" /> Clear</button></div><form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2"><input value={value} onChange={(event) => setValue(event.target.value)} disabled={busy} placeholder={`Ask ${name}…`} className="min-w-0 flex-1 rounded-full border bg-background px-4 py-3 text-sm" /><button type="submit" disabled={busy || !value.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label="Send"><Send className="size-4" /></button></form></footer></section></div>}</>;
}
