"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import MonacoEditor from "@/components/editor/MonacoEditor";
import ProblemHeader from "@/components/editor/ProblemHeader";
import SubmissionResult from "@/components/editor/SubmissionResult";
import SubmissionPanel from "@/components/editor/SubmissionPanel";
import { getTemplate } from "@/components/editor/CodeTemplate";
import { getSavedCode, useCodeAutoSave } from "@/hooks/useCodeAutoSave";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, Copy, Expand, Loader2, Maximize2, Minus, Plus, Play, Shrink } from "lucide-react";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
];

const FONT_SIZES = [12, 14, 16, 18, 20];

interface ProblemData {
  id: number; title: string; description: string;
  input_format: string | null; output_format: string | null;
  sample_cases: { input: string; output: string }[];
  difficulty: string; difficulty_score: number;
  time_limit: number; memory_limit: number;
  source: string | null; tags: string[];
  sample_count: number; hidden_count: number;
}

interface SubResult {
  status: string; execution_time: number | null;
  execution_memory: number | null; score: number; error_message: string | null;
}

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubResult | null>(null);
  const [subRefreshKey, setSubRefreshKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [copied, setCopied] = useState<string | null>(null);

  // Load template + saved code on language/problem change
  useEffect(() => {
    const saved = getSavedCode(id, language);
    setCode(saved || getTemplate(language));
    setResult(null);
  }, [id, language]);

  // Auto-save
  useCodeAutoSave(id, language, code);

  const fetchProblem = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/problems/${id}`);
      setProblem(resp.data.data);
    } catch { toast.error("题目加载失败"); } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProblem(); }, [fetchProblem]);

  const handleSubmit = async () => {
    if (!user) { toast.error("请先登录"); return; }
    if (!code.trim()) { toast.error("请输入代码"); return; }

    setSubmitting(true);
    setResult({ status: "Pending", execution_time: null, execution_memory: null, score: 0, error_message: null });
    try {
      const resp = await api.post(`/problems/${id}/submit`, { language, code });
      const subId = resp.data.data.submission_id;
      setResult({ status: "Running", execution_time: null, execution_memory: null, score: 0, error_message: null });

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const subResp = await api.get(`/submissions/${subId}`);
          const sub = subResp.data.data;
          if (sub.status !== "Pending" && sub.status !== "Running" && sub.status !== "Compiling") {
            setResult(sub);
            setSubRefreshKey((k) => k + 1);
            if (sub.status === "AC") toast.success("通过！🎉");
            else toast.error(`结果: ${sub.status}`);
            break;
          }
          setResult({ status: sub.status, execution_time: null, execution_memory: null, score: 0, error_message: null });
        } catch { break; }
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "提交失败";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSubmission = async (sub: { id: number }) => {
    try {
      const resp = await api.get(`/submissions/${sub.id}`);
      setCode(resp.data.data.code);
      setLanguage(resp.data.data.language);
      toast.success("已加载提交代码");
    } catch { toast.error("加载失败"); }
  };

  const copySample = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 h-[calc(100vh-3.5rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          <div className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!problem) return <div className="text-center py-20 text-muted-foreground">题目不存在</div>;

  const editor = (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(v) => setLanguage(v ?? "python")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Font size */}
          <div className="hidden sm:flex items-center gap-1 border rounded px-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFontSize(Math.max(12, fontSize - 2))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFontSize(Math.min(20, fontSize + 2))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Shrink className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
            {fullscreen ? "退出全屏" : "全屏"}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            提交评测
          </Button>
        </div>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden">
        <MonacoEditor language={language} value={code} onChange={setCode} height="100%" />
      </div>

      {result && <SubmissionResult result={result} />}
    </div>
  );

  return (
    <>
      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background p-4">
          <div className="h-full">{editor}</div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 h-[calc(100vh-3.5rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left: Problem */}
          <ScrollArea className="h-full border rounded-lg p-6">
            <div className="space-y-4">
              <ProblemHeader
                title={problem.title}
                difficulty={problem.difficulty}
                difficultyScore={problem.difficulty_score}
                timeLimit={problem.time_limit}
                memoryLimit={problem.memory_limit}
                tags={problem.tags}
              />

              <MarkdownRenderer content={problem.description} />

              {problem.input_format && (
                <>
                  <h3 className="font-semibold">输入格式</h3>
                  <pre className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">{problem.input_format}</pre>
                </>
              )}
              {problem.output_format && (
                <>
                  <h3 className="font-semibold">输出格式</h3>
                  <pre className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">{problem.output_format}</pre>
                </>
              )}

              {problem.sample_cases?.length > 0 && (
                <>
                  <h3 className="font-semibold">样例</h3>
                  {problem.sample_cases.map((tc, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">输入 #{i + 1}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copySample(tc.input, `in-${i}`)}
                          >
                            {copied === `in-${i}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <pre className="bg-zinc-900 text-zinc-100 p-2 rounded text-sm whitespace-pre-wrap">{tc.input}</pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">输出 #{i + 1}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copySample(tc.output, `out-${i}`)}
                          >
                            {copied === `out-${i}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <pre className="bg-zinc-900 text-zinc-100 p-2 rounded text-sm whitespace-pre-wrap">{tc.output}</pre>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Right: Editor + Submissions */}
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1 min-h-0">{editor}</div>
            <SubmissionPanel problemId={id} refreshKey={subRefreshKey} onSelect={handleLoadSubmission} />
          </div>
        </div>
      </div>
    </>
  );
}
