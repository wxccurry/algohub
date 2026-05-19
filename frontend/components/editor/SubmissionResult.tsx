"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Copy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FailedCase {
  input: string;
  expected: string;
  actual: string;
  caseNumber: number;
}

type Phase = "submitted" | "running" | "done" | "minimized";

interface SubmissionResultProps {
  initialPhase?: Phase;
  status?: string;
  currentCase?: number;
  totalCases?: number;
  executionTime?: number;
  executionMemory?: number;
  beatsPercent?: number;
  failedCase?: FailedCase;
  aiHint?: string;
}

export default function SubmissionResult({
  initialPhase = "submitted",
  status,
  currentCase = 0,
  totalCases = 0,
  executionTime,
  executionMemory,
  beatsPercent,
  failedCase,
  aiHint,
}: SubmissionResultProps) {
  const [phase, setPhase] = useState<Phase>(initialPhase);

  useEffect(() => {
    setPhase(initialPhase);
  }, [initialPhase]);

  const isAC = status === "Accepted";

  if (phase === "minimized") {
    return (
      <motion.div
        className={`fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-full cursor-pointer text-sm font-medium shadow-lg ${
          isAC ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"
        }`}
        onClick={() => setPhase("done")}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" }}
      >
        {isAC ? "✅ " : "❌ "}{status}
        <ChevronUp className="inline h-3 w-3 ml-1" />
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        style={{ maxHeight: 320 }}
        className={`rounded-lg border-2 p-4 overflow-y-auto ${
          phase === "done" && isAC
            ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
            : phase === "done" && !isAC
            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
            : "border-border bg-card"
        }`}
      >
        {/* Phase 1: Submitted / Queued */}
        {phase === "submitted" && (
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />
            <span className="text-sm">已加入评测队列...</span>
          </div>
        )}

        {/* Phase 2: Running */}
        {phase === "running" && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                正在评测... 第 {currentCase}/{totalCases} 个用例
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${totalCases > 0 ? (currentCase / totalCases) * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Phase 3: Done (AC or WA/TLE/RE...) */}
        {phase === "done" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              {isAC ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </motion.div>
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <span className={`text-lg font-bold ${isAC ? "text-green-600" : "text-red-600"}`}>
                {status}
              </span>
            </div>

            {isAC && (
              <div className="text-sm space-y-1 mb-3">
                {executionTime !== undefined && <div>运行时间: {executionTime}ms</div>}
                {executionMemory !== undefined && (
                  <div>内存消耗: {(executionMemory / 1024).toFixed(1)}MB</div>
                )}
                {beatsPercent !== undefined && (
                  <div className="font-medium text-green-700 dark:text-green-400">
                    击败了 {beatsPercent}% 的提交
                  </div>
                )}
              </div>
            )}

            {!isAC && failedCase && (
              <div className="text-sm space-y-1 mb-3">
                <div className="font-medium">
                  第 {failedCase.caseNumber} 个用例失败:
                </div>
                <div className="bg-muted p-2 rounded font-mono text-xs space-y-0.5">
                  <div>输入: {failedCase.input}</div>
                  <div>期望: {failedCase.expected}</div>
                  <div className="text-red-600 dark:text-red-400">实际: {failedCase.actual}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(failedCase.input);
                    toast.success("已复制失败用例");
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3 w-3" /> 复制失败用例
                </button>
                {aiHint && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs mt-2">
                    💡 {aiHint}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setPhase("minimized")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              收起 <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
