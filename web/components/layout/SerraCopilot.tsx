"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  LoaderCircle,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant" | "guard";
  content: string;
}

export function SerraCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getAccessToken } = usePrivy();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Listen for sidebar toggle event
  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener("serra-copilot-toggle", handler);
    return () => window.removeEventListener("serra-copilot-toggle", handler);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const history = messages
        .filter((m) => m.role !== "guard")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/copilot", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Serra Copilot encountered an error. Please try again." },
        ]);
        return;
      }

      const data = await res.json();
      const reply = data.reply as string;
      const guarded = data.guarded as boolean;

      setMessages((prev) => [
        ...prev,
        { role: guarded ? "guard" : "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Serra Copilot is temporarily unavailable." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, getAccessToken]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-text text-surface shadow-lg hover:bg-text/90 transition-all duration-200"
        title="Serra Copilot"
      >
        {open ? <X size={18} strokeWidth={1.8} /> : <Sparkles size={18} strokeWidth={1.8} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-bg-elevated shadow-xl flex flex-col overflow-hidden h-[520px] max-h-[calc(100vh-7rem)]">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-text text-surface">
                <Bot size={16} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Serra Copilot</p>
                <p className="text-[10px] text-text-subtle font-mono uppercase tracking-[0.06em]">
                  rwa specialist
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 -mr-1 rounded-md text-text-subtle hover:text-text transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-text/5">
                  <Sparkles size={18} strokeWidth={1.5} className="text-text-muted" />
                </div>
                <p className="text-sm text-text-muted max-w-[240px] leading-5">
                  ask me anything about rwa tokenization, erc-4626 vault strategies, or serra&apos;s agent loop.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["what is rwa tokenization?", "how does the vault rebalance?", "explain erc-4626 yield"].map(
                    (q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => { setInput(q); setTimeout(() => send(), 50); }}
                        className="px-2.5 py-1 text-[11px] rounded-full border border-border text-text-muted hover:text-text hover:border-border-strong transition-colors"
                      >
                        {q}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-text text-surface mt-0.5">
                    {msg.role === "guard" ? (
                      <ShieldAlert size={12} strokeWidth={1.8} />
                    ) : (
                      <Bot size={12} strokeWidth={1.8} />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-6 ${
                    msg.role === "user"
                      ? "bg-text text-surface rounded-br-md"
                      : msg.role === "guard"
                        ? "bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-bl-md dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200"
                        : "bg-surface-muted text-text rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted mt-0.5">
                    <User size={12} strokeWidth={1.8} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-text text-surface mt-0.5">
                  <Bot size={12} strokeWidth={1.8} />
                </div>
                <div className="rounded-xl rounded-bl-md px-3 py-2.5 bg-surface-muted">
                  <LoaderCircle size={14} className="animate-spin text-text-muted" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 py-2.5 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ask about rwa, vaults, or yield…"
                disabled={loading}
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-text transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-text text-surface hover:bg-text/90 transition-colors disabled:opacity-30"
              >
                <Send size={14} strokeWidth={1.8} />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-text-subtle text-center font-mono">
              serra copilot · rwa-only · responses may be inaccurate
            </p>
          </div>
        </div>
      )}
    </>
  );
}
