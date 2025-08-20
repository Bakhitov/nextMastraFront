import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../../components/ui/accordion";
import { useNavigate, useParams } from "react-router-dom";
import { api, fetchMyProfile } from "../../../lib/api";
import { storage } from "../../../lib/storage";

type Msg = { id: string; role: "user" | "assistant"; content: string; createdAt?: number };
type ToolExec = { id: string; toolName: string; args?: any; result?: any; status?: "pending" | "success" | "error"; createdAt?: number; messageId?: string; callId?: string };

export default function ChatThread() {
  const navigate = useNavigate();
  const { threadId = "" } = useParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [toolExecutions, setToolExecutions] = useState<ToolExec[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const [title, setTitle] = useState<string>("Чат");
  const [atBottom, setAtBottom] = useState(true);
  const [llmReady, setLlmReady] = useState<boolean>(true);
  const [llmMissing, setLlmMissing] = useState<string[]>([]);

  function normalizeToolResult(result: any): any {
    try {
      if (result && typeof result === "object") {
        if (Object.prototype.hasOwnProperty.call(result, "structuredContent")) {
          return (result as any).structuredContent;
        }
        const content = (result as any).content;
        if (Array.isArray(content)) {
          const textItem = content.find((c: any) => typeof c?.text === "string");
          if (textItem && typeof textItem.text === "string") {
            const s = textItem.text.trim();
            if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
              try { return JSON.parse(s); } catch {}
            }
            return s;
          }
        }
      } else if (typeof result === "string") {
        const s = result.trim();
        if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
          try { return JSON.parse(s); } catch {}
        }
        return result;
      }
    } catch {}
    return result;
  }

  useEffect(() => {
    (async () => {
      const user = await storage.get<{ id: string }>("user");
      if (!user) return navigate("/auth/login", { replace: true });
      // fetch profile once → access filter + sync
      try {
        const profile = await fetchMyProfile();
        if (profile) {
          const isActive = Boolean((profile as any)?.is_active);
          await storage.setItems({
            provider_llm: profile.provider_llm ?? "",
            model_llm: profile.model_llm ?? "",
            api_key_llm: profile.api_key_llm ?? "",
            api_key_by_type: profile.api_key_by_type ?? "",
            url_by_type: profile.url_by_type ?? "",
            is_active: isActive,
          });
          if (!isActive) {
            navigate("/settings", { replace: true });
            return;
          }
        } else {
          const isActive = (await storage.get<boolean>("is_active")) ?? false;
          if (!isActive) {
            navigate("/settings", { replace: true });
            return;
          }
        }
      } catch {
        const isActive = (await storage.get<boolean>("is_active")) ?? false;
        if (!isActive) {
          navigate("/settings", { replace: true });
          return;
        }
      }
      // check LLM config availability
      try {
        const [provider, model, apiKey] = await Promise.all([
          storage.get<string>("provider_llm"),
          storage.get<string>("model_llm"),
          storage.get<string>("api_key_llm"),
        ]);
        const missing: string[] = [];
        if (!provider) missing.push("provider");
        if (!model) missing.push("model");
        if (!apiKey) missing.push("api_key");
        setLlmMissing(missing);
        setLlmReady(missing.length === 0);
      } catch {}
      // восстановить черновик
      const draft = await storage.get<string>(`draft:${threadId}`);
      if (draft) setInput(draft);
      try {
        const details = await api.get(`/api/v1/threads/${threadId}`);
        if (details?.title) setTitle(details.title);
      } catch {}
      try {
        const json = await api.get(`/api/v1/threads/${threadId}/messages`);
        const raw = (json?.messages ?? []) as any[];
        const out: Msg[] = [];
        const toolList: ToolExec[] = [];
        let pendingTools: ToolExec[] = [];
        for (const m of raw) {
          const id = m.id ?? crypto.randomUUID();
          const role = (m.role as Msg["role"]) ?? "assistant";
          const msgType = (m?.type as string | undefined) || undefined;
          const c = m?.content;
          const parts = Array.isArray(m?.parts) ? m.parts : Array.isArray(c) ? c : [];
          // collect tool events to attach to the next assistant message
          if (msgType === "tool-call" || msgType === "tool-result") {
            const list = Array.isArray(c) ? c : parts;
            for (const part of list) {
              const toolName = part?.toolName || part?.tool?.name || "tool";
              const args = part?.args;
              const result = part?.result;
              if (msgType === "tool-call") {
                pendingTools.push({ id: crypto.randomUUID(), toolName, args, status: "pending", createdAt: m?.createdAt ? Date.parse(m.createdAt) : Date.now() });
              } else {
                const last = [...pendingTools].reverse().find((t) => t.toolName === toolName && t.result === undefined);
                if (last) {
                  last.result = normalizeToolResult(result);
                  last.status = "success";
                } else {
                  pendingTools.push({ id: crypto.randomUUID(), toolName, result: normalizeToolResult(result), status: "success", createdAt: m?.createdAt ? Date.parse(m.createdAt) : Date.now() });
                }
              }
            }
            continue;
          }
          const toolInv = Array.isArray(parts) ? parts.filter((p: any) => p?.type === "tool-invocation") : [];
          if (toolInv.length > 0) {
            for (const p of toolInv) {
              const t = p.toolInvocation || {};
              const toolName = t.toolName || "tool";
              const args = t.args;
              const result = t.result;
              pendingTools.push({ id: crypto.randomUUID(), toolName, args, result: normalizeToolResult(result), createdAt: m?.createdAt ? Date.parse(m.createdAt) : Date.now() });
            }
            // don't continue; still render assistant message content below
          }
          let text = "";
          if (typeof c === "string") text = c;
          else if (Array.isArray(c)) text = c.map((p: any) => (typeof p === "string" ? p : p?.text ?? p?.content ?? "")).join("");
          else if (c && typeof c === "object") text = c.content ?? "";
          else if (m?.parts && Array.isArray(m.parts)) text = m.parts.map((p: any) => p?.text ?? "").join("");
          const createdAt = m?.createdAt ? Date.parse(m.createdAt) : Date.now();
          // when we hit an assistant message, attach any pending tools to it
          if (role === "assistant" && pendingTools.length > 0) {
            for (const t of pendingTools) toolList.push({ ...t, messageId: id });
            pendingTools = [];
          }
          out.push({ id, role, content: text, createdAt });
        }
        // fallback: if pending tools remain, attach to last assistant message
        if (pendingTools.length > 0) {
          const lastAssistant = [...out].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) {
            for (const t of pendingTools) toolList.push({ ...t, messageId: lastAssistant.id });
          }
        }
        setMessages(out);
        setToolExecutions(toolList);
      } catch {
        setMessages([]);
      }
    })();
  }, [threadId]);

  useEffect(() => {
    storage.setItems({ [`draft:${threadId}`]: input });
  }, [input, threadId]);

  useEffect(() => {
    if (atBottom) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(diff < 16);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!llmReady) {
      navigate("/settings");
      return;
    }
    // access filter
    const isActive = (await storage.get<boolean>("is_active")) ?? false;
    if (!isActive) {
      navigate("/settings", { replace: true });
      return;
    }
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text, createdAt: Date.now() }]);
    setInput("");
    storage.setItems({ [`draft:${threadId}`]: "" });
    setLoading(true);
    const assistantId = crypto.randomUUID();
    assistantIdRef.current = assistantId;
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() }]);

    try {
      const token = (await storage.get<string>('sb-access-token')) || (await storage.get<string>('accessToken'));
      const user = await storage.get<{ id: string }>("user");
      const base = (import.meta as any)?.env?.VITE_API_BASE_URL || "http://localhost:3000";
      const useVNext = true;
      const endpoint = useVNext ? `${base}/api/v1/agents/n8nAgent/stream-vnext` : `${base}/api/v1/agents/n8nAgent/stream`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          memory: { thread: threadId, resource: user?.id },
        }),
      });
      if (!res.ok || !res.body) {
        if (res.status === 401) {
          await storage.clear();
          navigate('/auth/login', { replace: true });
          return;
        }
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const appendText = (delta: string) => {
        if (!delta) return;
        setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + delta } : msg)));
      };

      const addToolCall = (toolName: string, args: any, callId?: string) => {
        setToolExecutions((list) => [...list, { id: crypto.randomUUID(), toolName, args, status: "pending", createdAt: Date.now(), messageId: assistantId, callId }]);
      };
      const addToolResult = (toolName: string, result: any, callId?: string) => {
        setToolExecutions((list) => {
          // 1) try match by callId
          const byCallId = callId
            ? [...list]
                .map((t, i) => ({ t, i }))
                .reverse()
                .find((x) => x.t.callId === callId && x.t.result === undefined && x.t.messageId === assistantId)?.i
            : undefined;
          const idx = byCallId !== undefined
            ? byCallId
            : [...list]
                .map((t, i) => ({ t, i }))
                .reverse()
                .find((x) => x.t.toolName === toolName && x.t.result === undefined && x.t.messageId === assistantId)?.i;
          if (idx !== undefined) {
            const copy = [...list];
            copy[idx] = { ...copy[idx], result: normalizeToolResult(result), status: "success" };
            return copy;
          }
          return [...list, { id: crypto.randomUUID(), toolName, result: normalizeToolResult(result), status: "success", createdAt: Date.now(), messageId: assistantId, callId }];
        });
      };

      let shouldStop = false;
      while (!shouldStop) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ""; // keep last partial line
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          // Mastra stream frames examples:
          // f:{...}  -> frame meta (ignore)
          // 0:"text" -> token chunk for channel 0 (append)
          // 9:{toolCall...} -> tool-call frame (AI SDK style)
          // a:{toolResult...} -> tool-result frame (AI SDK style)
          // e:{...} or d:{...} -> end frames (but 'tool-calls' means continue)
          if (line.startsWith("0:")) {
            const payload = line.slice(2).trim();
            // try parse quoted JSON string, else strip quotes
            let textPart = "";
            try {
              textPart = JSON.parse(payload);
            } catch {
              textPart = payload.replace(/^\"|\"$/g, "");
            }
            appendText(textPart);
            continue;
          }
          if (line.startsWith("9:")) {
            // tool-call frame
            try {
              const obj = JSON.parse(line.slice(2).trim());
              const toolName = obj?.toolName || obj?.tool?.name || 'tool';
              const callId = obj?.toolCallId;
              addToolCall(toolName, obj?.args, callId);
            } catch {}
            continue;
          }
          if (line.startsWith("a:")) {
            // tool-result frame
            try {
              const obj = JSON.parse(line.slice(2).trim());
              const toolName = obj?.toolName || obj?.tool?.name || 'tool';
              const callId = obj?.toolCallId;
              addToolResult(toolName, obj?.result, callId);
            } catch {}
            continue;
          }
          if (line.startsWith("data:")) {
            const payload = line.slice(5).trim();
            try {
              const obj = JSON.parse(payload);
              // vNext: generic event envelope { type, payload }
              const t = obj?.type;
              const p = obj?.payload ?? obj;
              // tool streaming annotations from writer
              if (p?.type === 'weather-data' && (p?.status === 'pending' || p?.status === 'success')) {
                // отобразим как tool-call/tool-result
                if (p.status === 'pending') {
                  addToolCall('get-weather', p.args);
                } else if (p.status === 'success') {
                  addToolResult('get-weather', p.result);
                }
              }
              if (t === 'text-delta') {
                const token = p?.delta ?? p?.content ?? '';
                if (typeof token === 'string') appendText(token);
              } else if (t === 'tool-call') {
                const toolName = p?.toolName || p?.tool?.name || 'tool';
                const callId = p?.toolCallId || p?.id;
                addToolCall(toolName, p?.args, callId);
              } else if (t === 'tool-result') {
                const toolName = p?.toolName || p?.tool?.name || 'tool';
                const callId = p?.toolCallId || p?.id;
                addToolResult(toolName, p?.result, callId);
              } else if (p?.delta || p?.token || p?.content) {
                const token = p?.delta ?? p?.token ?? p?.content ?? '';
                if (typeof token === 'string') appendText(token);
              }
            } catch {}
            continue;
          }
          if (line.startsWith("e:") || line.startsWith("d:")) {
            // stop only if this is true end; ignore tool-calls finish
            try {
              const endObj = JSON.parse(line.slice(2).trim());
              const finish = endObj?.finishReason;
              if (finish === 'tool-calls') {
                continue;
              }
            } catch {}
            shouldStop = true;
            break;
          }
          // ignore f: and others
        }
      }
    } catch (err: any) {
      if (err?.status === 401) {
        await storage.clear();
        navigate('/auth/login', { replace: true });
        return;
      }
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + "\n[Ошибка]" } : msg)));
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteThread() {
    const isActive = (await storage.get<boolean>("is_active")) ?? false;
    if (!isActive) {
      navigate("/settings", { replace: true });
      return;
    }
    try {
      await api.del(`/api/v1/threads/${threadId}`);
    } catch (e: any) {
      if (e?.status === 401) {
        await storage.clear();
        navigate('/auth/login', { replace: true });
        return;
      }
      throw e;
    }
    navigate("/chats", { replace: true });
  }

  async function onCreateNew() {
    const title = prompt("Название нового чата", `Новый чат ${new Date().toLocaleString()}`);
    if (!title) return;
    const isActive = (await storage.get<boolean>("is_active")) ?? false;
    if (!isActive) {
      navigate("/settings", { replace: true });
      return;
    }
    const user = await storage.get<{ id: string }>("user");
    if (!user) return navigate("/auth/login", { replace: true });
    const created = await api.post(`/api/v1/threads`, { title, metadata: {}, resourceId: user.id, agentId: "n8nAgent" });
    const newId = created?.id || created?.threadId;
    if (newId) navigate(`/chats/${newId}`, { replace: true });
  }

  return (
    <div className="h-full grid" style={{ gridTemplateRows: "auto 1fr" }}>
      <div className="header p-3">
        <div className="font-semibold text-sm">{title}</div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <Button variant="outline" onClick={() => navigate("/chats")}>Главная</Button>
          <Button variant="outline" onClick={onCreateNew}>Новый чат</Button>
          <Button variant="destructive" onClick={onDeleteThread}>Удалить</Button>
        </div>
      </div>
      {!llmReady && (
        <div className="mx-3" style={{ marginTop: 8 }}>
          <div className="rounded-md" style={{ background: '#fffbe6', border: '1px solid #f59e0b', padding: 12 }}>
            <div className="text-sm font-medium" style={{ color: '#92400e' }}>Требуются настройки LLM</div>
            <div className="text-xs" style={{ color: '#92400e', marginTop: 4 }}>
              Заполните: {llmMissing.join(', ')}
            </div>
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => navigate('/settings')}>Открыть настройки</Button>
            </div>
          </div>
        </div>
      )}
      <div className="chat-wrap mx-3 mt-3 mb-0 relative" style={{ height: "100%" }}>
            <div ref={scrollRef} className="messages">
              {messages.map((m) => {
                const toolsForMsg = m.role === "assistant" ? toolExecutions.filter((t) => t.messageId === m.id) : [];
                return (
                  <div key={m.id} className="message">
                    <div className="meta">{m.role === "user" ? "Вы" : "Ассистент"}</div>
                    {toolsForMsg.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div className="text-xs font-medium text-neutral-600 mb-1">Details</div>
                        <Accordion type="multiple" className="space-y-1">
                          {toolsForMsg.map((t) => (
                            <AccordionItem key={t.id} value={t.id}>
                              <AccordionTrigger className="acc-trigger">{t.toolName}</AccordionTrigger>
                              <AccordionContent className="acc-content">
                                <div className="tool-panel">
                                  {t.args !== undefined && (
                                    <div className="text-xs text-neutral-700"><b>args</b>: <pre className="whitespace-pre-wrap break-words">{JSON.stringify(t.args, null, 2)}</pre></div>
                                  )}
                                  {t.result !== undefined && (
                                    <div className="text-xs text-neutral-700 mt-1"><b>result</b>: <pre className="whitespace-pre-wrap break-words">{JSON.stringify(t.result, null, 2)}</pre></div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}
                    <div className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}>{m.content}</div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={onSend} className="inputbar">
              <Input disabled={!llmReady || loading} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Сообщение" />
              <Button disabled={!llmReady || loading} type="submit">{loading ? "Отправка..." : "Отправить"}</Button>
            </form>
            {!atBottom && (
              <button
                aria-label="Scroll to bottom"
                className="absolute z-10 rounded-full shadow-sm"
                style={{ right: 12, bottom: 72, width: 36, height: 36, background: '#ffffff', border: '1px solid #e5e7eb' }}
                onClick={() => {
                  setAtBottom(true);
                  requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
                }}
              >
                <span style={{ fontSize: 18, lineHeight: '36px', display: 'block' }}>↓</span>
              </button>
            )}
      </div>
    </div>
  );
}


