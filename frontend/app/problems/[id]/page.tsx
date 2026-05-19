"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Group, Panel, Separator } from "react-resizable-panels";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import MonacoEditor from "@/components/editor/MonacoEditor";
import ProblemHeader from "@/components/editor/ProblemHeader";
import SubmissionResult from "@/components/editor/SubmissionResult";
import SubmissionPanel from "@/components/editor/SubmissionPanel";
import SubmitButton from "@/components/editor/SubmitButton";
import { getTemplate } from "@/components/editor/CodeTemplate";
import { getSavedCode, useCodeAutoSave } from "@/hooks/useCodeAutoSave";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useSSE } from "@/hooks/useSSE";
import { AIFloatingAssistant } from "@/components/ai";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, Copy, Maximize2, Minus, Plus, Shrink } from "lucide-react";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
];

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
  const [result, setResult] = useState<SubResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [subRefreshKey, setSubRefreshKey] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("description");
  const [sseEnabled, setSseEnabled] = useState(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<number | null>(null);
  const [waCount, setWaCount] = useState(0);

  // Polling fallback ref to allow cancellation
  const pollAbortRef = useRef(false);

  // Auto-save code changes
  useCodeAutoSave(id, language, code);

  // Load template + saved code on language or problem change
  useEffect(() => {
    const saved = getSavedCode(id, language);
    setCode(saved || getTemplate(language));
    setResult(null);
  }, [id, language]);

  // Fetch problem data
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

  // Submit handler — POST then background-poll for result
  const handleSubmit = useCallback(async () => {
    if (!user) { toast.error("请先登录"); return; }
    if (!code.trim()) { toast.error("请输入代码"); return; }
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setResult({ status: "Pending", execution_time: null, execution_memory: null, score: 0, error_message: null });

    try {
      const resp = await api.post(`/problems/${id}/submit`, { language, code });
      const subId = resp.data.data.submission_id;

      // Use SSE for real-time updates with polling fallback on error
      pollAbortRef.current = false; // Cancel any running polling fallback
      setCurrentSubmissionId(subId);
      setSseEnabled(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "提交失败";
      toast.error(msg);
      submittingRef.current = false;
      setSubmitting(false);
      setResult(null);
    }
  }, [id, language, code, user]);

  // Load submission code into editor
  const handleLoadSubmission = useCallback(async (sub: { id: number }) => {
    try {
      const resp = await api.get(`/submissions/${sub.id}`);
      setCode(resp.data.data.code);
      setLanguage(resp.data.data.language);
      toast.success("已加载提交代码");
    } catch { toast.error("加载失败"); }
  }, []);

  // Copy sample case text
  const copySample = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  // Global keyboard shortcuts
  useHotkeys([
    { key: "Enter", ctrl: true, handler: () => handleSubmit(), enabled: !!problem && !submitting },
    { key: "'", ctrl: true, handler: () => { /* run test — placeholder */ }, enabled: !!problem },
  ]);

  // Polling fallback — same logic as before, called when SSE fails
  const startPolling = useCallback(
    (subId: number) => {
      pollAbortRef.current = false;
      (async () => {
        for (let i = 0; i < 30; i++) {
          if (pollAbortRef.current) break;
          await new Promise((r) => setTimeout(r, 1500));
          if (pollAbortRef.current) break;
          try {
            const subResp = await api.get(`/submissions/${subId}`);
            const sub = subResp.data.data;
            if (sub.status !== "Pending" && sub.status !== "Running" && sub.status !== "Compiling") {
              setResult(sub);
              setSubRefreshKey((k) => k + 1);
              if (sub.status === "AC") {
                toast.success("通过！");
                setWaCount(0);
                (window as any).__aiCelebrate?.();
              } else {
                toast.error(`结果: ${sub.status}`);
                setWaCount(c => c + 1);
              }
              break;
            }
            setResult((prev) => (prev ? { ...prev, status: sub.status } : null));
          } catch {
            break;
          }
        }
        submittingRef.current = false;
        setSubmitting(false);
      })();
    },
    [],
  );

  // SSE real-time streaming for submission status
  const sseUrl = currentSubmissionId
    ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/submissions/${currentSubmissionId}/stream`
    : "";

  useSSE(sseUrl, {
    enabled: sseEnabled,
    onMessage: (data: any) => {
      if (data.type === "judge_complete") {
        setResult(data.data);
        setSubRefreshKey((k) => k + 1);
        const status = data.data?.status;
        if (status === "AC") {
          toast.success("通过！");
          setWaCount(0);
          (window as any).__aiCelebrate?.();
        } else {
          toast.error(`结果: ${status}`);
          setWaCount(c => c + 1);
        }
        setSseEnabled(false);
        submittingRef.current = false;
        setSubmitting(false);
      } else if (data.type === "judge_progress") {
        setResult(data.data);
      } else if (data.type === "judge_queued") {
        // Submission accepted by judge queue
      }
    },
    onError: () => {
      setSseEnabled(false);
      // Fall back to polling
      if (currentSubmissionId) {
        startPolling(currentSubmissionId);
      }
    },
  });

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        <Skeleton className="h-16 w-full rounded-none" />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 p-6 space-y-4 overflow-hidden">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="flex-1 p-6 space-y-4 overflow-hidden">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!problem) return <div className="text-center py-20 text-muted-foreground">题目不存在</div>;

  // ── Editor section (shared between normal and fullscreen views) ──
  const editorSection = (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar: language selector, font size, fullscreen toggle, submit */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(v) => setLanguage(v ?? "python")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Font size controls */}
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
          <SubmitButton onSubmit={handleSubmit} disabled={submitting || !code.trim()} />
        </div>
      </div>

      {/* Monaco editor */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <MonacoEditor language={language} value={code} onChange={setCode} height="100%" fontSize={fontSize} />
      </div>

      {/* Submission result */}
      {result && (
        <SubmissionResult
          initialPhase={
            result.status === "Pending" ? "submitted"
            : result.status === "Running" || result.status === "Compiling" ? "running"
            : "done"
          }
          status={result.status === "AC" ? "Accepted" : result.status}
          executionTime={result.execution_time ?? undefined}
          executionMemory={result.execution_memory ?? undefined}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Fullscreen editor overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background p-4">
          <div className="h-full">{editorSection}</div>
        </div>
      )}

      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        {/* AI Floating Assistant */}
        <AIFloatingAssistant
          problemId={Number(id)}
          problemTitle={problem?.title}
          waCount={waCount}
          currentCode={code}
          language={language}
        />

        {/* Problem header spans full width */}
        <ProblemHeader
          title={problem.title}
          difficulty={problem.difficulty}
          difficultyScore={problem.difficulty_score}
          timeLimit={problem.time_limit}
          memoryLimit={problem.memory_limit}
          tags={problem.tags}
        />

        {/* Split-pane layout */}
        <div className="flex-1 min-h-0">
          <Group orientation="horizontal">
            {/* ── Left Panel: Tabs (Description / Solutions / Submissions / Visualization) ── */}
            <Panel defaultSize="45" minSize="25">
              <div className="h-full overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <TabsList className="w-full shrink-0 rounded-none border-b">
                    <TabsTrigger value="description">描述</TabsTrigger>
                    <TabsTrigger value="solutions">题解</TabsTrigger>
                    <TabsTrigger value="submissions">提交</TabsTrigger>
                    <TabsTrigger value="visualization">可视化</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    <TabsContent value="description" className="mt-0 space-y-4">
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
                    </TabsContent>

                    <TabsContent value="solutions" className="mt-0">
                      <p className="text-muted-foreground text-sm">暂无题解</p>
                    </TabsContent>

                    <TabsContent value="submissions" className="mt-0">
                      <SubmissionPanel problemId={id} refreshKey={subRefreshKey} onSelect={handleLoadSubmission} />
                    </TabsContent>

                    <TabsContent value="visualization" className="mt-0">
                      <p className="text-muted-foreground text-sm">可视化演示加载中...</p>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </Panel>

            {/* ── Draggable Resize Handle ── */}
            <Separator className="w-1.5 bg-border hover:bg-primary/50 transition-colors duration-100 cursor-col-resize" />

            {/* ── Right Panel: Code Editor + Submit ── */}
            <Panel defaultSize="55" minSize="30">
              <div className="h-full p-3">
                {editorSection}
              </div>
            </Panel>
          </Group>
        </div>
      </div>
    </>
  );
}
