"use client";
import { useState, useRef, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSubmit: () => Promise<void>;
  disabled?: boolean;
}

export default function SubmitButton({ onSubmit, disabled }: Props) {
  const [phase, setPhase] = useState<"idle" | "confirming" | "loading">("idle");
  const pressTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTime = useRef(0);
  const [progress, setProgress] = useState(0);

  const onPressStart = useCallback(() => {
    if (disabled || phase !== "idle") return;
    startTime.current = Date.now();
    setPhase("confirming");
    pressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      setProgress(Math.min(elapsed / 180, 1));
      if (elapsed >= 180) {
        clearInterval(pressTimer.current);
        setPhase("loading");
        onSubmit().finally(() => {
          setPhase("idle");
          setProgress(0);
        });
      }
    }, 16);
  }, [disabled, phase, onSubmit]);

  const onPressEnd = useCallback(() => {
    if (phase === "confirming") {
      clearInterval(pressTimer.current);
      setProgress(0);
      setPhase("idle");
    }
  }, [phase]);

  return (
    <Button
      size="lg"
      disabled={disabled || phase === "loading"}
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onTouchStart={onPressStart}
      onTouchEnd={onPressEnd}
      className="relative overflow-hidden min-w-[120px] select-none"
    >
      {phase === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      <span className="relative z-10">
        {phase === "loading" ? "提交中..." : phase === "confirming" ? "按住提交..." : "提交"}
      </span>
      {phase === "confirming" && (
        <div
          className="absolute inset-0 bg-primary/20 transition-none pointer-events-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
    </Button>
  );
}
