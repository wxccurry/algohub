"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "./progress";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

interface Result {
  status: string; execution_time: number | null;
  execution_memory: number | null; score: number; error_message: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:  { label: "等待中",   color: "text-blue-500",   icon: <Clock className="h-4 w-4 animate-pulse" /> },
  Running:  { label: "评测中",   color: "text-blue-500",   icon: <Clock className="h-4 w-4 animate-spin" /> },
  Compiling:{ label: "编译中",   color: "text-blue-500",   icon: <Clock className="h-4 w-4 animate-spin" /> },
  AC:       { label: "通过",     color: "text-green-500",  icon: <CheckCircle2 className="h-4 w-4" /> },
  WA:       { label: "答案错误", color: "text-red-500",    icon: <XCircle className="h-4 w-4" /> },
  TLE:      { label: "运行超时", color: "text-yellow-500", icon: <AlertTriangle className="h-4 w-4" /> },
  MLE:      { label: "内存超限", color: "text-yellow-500", icon: <AlertTriangle className="h-4 w-4" /> },
  RE:       { label: "运行错误", color: "text-red-500",    icon: <XCircle className="h-4 w-4" /> },
  CE:       { label: "编译错误", color: "text-orange-500", icon: <XCircle className="h-4 w-4" /> },
  SE:       { label: "系统错误", color: "text-red-500",    icon: <XCircle className="h-4 w-4" /> },
};

export default function SubmissionResult({ result }: { result: Result }) {
  const meta = STATUS_META[result.status] || STATUS_META.SE;
  const isFinal = !["Pending", "Running", "Compiling"].includes(result.status);

  return (
    <Card className="shrink-0">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          评测结果:
          <span className={`flex items-center gap-1 font-mono ${meta.color}`}>
            {meta.icon} {result.status} {meta.label}
          </span>
          {!isFinal && <Progress value={45} className="w-20" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-0 pb-3 text-sm space-y-1">
        {result.execution_time != null && <p>执行时间: {result.execution_time}ms</p>}
        {result.execution_memory != null && <p>内存: {result.execution_memory}KB</p>}
        {result.score > 0 && <p>得分: {result.score}</p>}
        {result.error_message && (
          <details open>
            <summary className="cursor-pointer text-red-500">错误详情</summary>
            <pre className="text-xs text-red-500 whitespace-pre-wrap mt-1 bg-red-50 dark:bg-red-950 p-2 rounded">
              {result.error_message}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
