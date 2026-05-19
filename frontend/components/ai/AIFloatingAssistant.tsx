"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

type AssistantMode = "silent" | "hinting" | "chatting" | "celebrating";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  problemId: number;
  problemTitle?: string;
  waCount?: number;
  currentCode?: string;
  language?: string;
  onHintApply?: (hint: string) => void;
}

export default function AIFloatingAssistant({ problemId, problemTitle, waCount = 0, currentCode, language = "python", onHintApply }: Props) {
  const [mode, setMode] = useState<AssistantMode>("silent");
  const [hintLevel, setHintLevel] = useState(1);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  // When WA count increases, show hint bubble
  useEffect(() => {
    if (waCount === 1) {
      setMode("hinting");
      setHintLevel(1);
    } else if (waCount === 2) {
      setMode("hinting");
      setHintLevel(2);
    } else if (waCount >= 3) {
      setMode("chatting");
      setPanelOpen(true);
      setHintLevel(3);
    }
  }, [waCount]);

  const fetchHint = useCallback(async (level: number) => {
    setLoading(true);
    try {
      const res = await api.post("/v1/ai/hint", {
        problem_id: problemId,
        hint_level: level,
        current_code: currentCode,
        language,
      });
      const hint = res.data.data.hint;
      setChatMessages(prev => [...prev, { role: "assistant", content: `💡 提示 L${level}: ${hint}` }]);
      return hint;
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "抱歉，提示生成失败，请稍后再试。" }]);
    } finally {
      setLoading(false);
    }
  }, [problemId, currentCode, language]);

  const handleBubbleClick = async () => {
    setMode("chatting");
    setPanelOpen(true);
    if (chatMessages.length === 0) {
      await fetchHint(hintLevel);
    }
  };

  const handleDismiss = () => {
    setMode("silent");
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setMessage("");
    setLoading(true);
    setStreaming("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/v1/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ problem_id: problemId, messages: chatMessages, current_code: currentCode, language }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                fullResponse += parsed.delta;
                setStreaming(fullResponse);
              } catch {}
            }
          }
        }
      }
      setChatMessages(prev => [...prev, { role: "assistant", content: fullResponse }]);
      setStreaming("");
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "网络错误，请重试。" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCelebrate = useCallback(() => {
    setMode("celebrating");
    setTimeout(() => setMode("silent"), 1500);
  }, []);

  // Expose celebrate for parent
  useEffect(() => {
    (window as any).__aiCelebrate = handleCelebrate;
    return () => { delete (window as any).__aiCelebrate; };
  }, [handleCelebrate]);

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Hint bubble */}
        <AnimatePresence>
          {mode === "hinting" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="bg-card border shadow-lg rounded-lg p-3 max-w-[260px] cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleBubbleClick}
            >
              <p className="text-sm">
                需要帮助吗？
                {waCount >= 2 && " 已经第 " + waCount + " 次了，要不要看看提示？"}
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDismiss(); }}>
                  忽略
                </Button>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleBubbleClick(); }}>
                  好的 <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          onClick={() => { setMode("chatting"); setPanelOpen(true); }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            mode === "celebrating"
              ? "bg-green-500 text-white animate-pulse"
              : mode === "hinting"
              ? "bg-primary text-primary-foreground animate-bounce"
              : "bg-primary/80 text-primary-foreground hover:bg-primary"
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {mode === "celebrating" ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </motion.button>
      </div>

      {/* Chat panel (slides in from right) */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-background border-l shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold">AI 导师</span>
                {problemTitle && <span className="text-xs text-muted-foreground">{problemTitle}</span>}
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm mt-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>你好！我是你的 AI 刷题导师。</p>
                  <p className="mt-1">我会引导你思考，但不会直接给答案。</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {[1,2,3,4].map(l => (
                      <Button key={l} variant="outline" size="sm" disabled={loading}
                        onClick={() => fetchHint(l)}>
                        L{l} 提示
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2 max-w-[85%] text-sm bg-muted">
                    {streaming}
                    <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              )}
              {loading && !streaming && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2 text-sm bg-muted">
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" />思考中...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t p-3 flex gap-2">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="输入消息..."
                disabled={loading}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSend} disabled={loading || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
