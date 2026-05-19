"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  AC: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  WA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  TLE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  RE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

interface Submission { id: number; status: string; language: string; created_at: string; }

interface Props {
  problemId: string;
  refreshKey: number;
  onSelect: (sub: Submission) => void;
}

export default function SubmissionPanel({ problemId, refreshKey, onSelect }: Props) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubs = async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/problems/${problemId}/submissions`, { params: { page: 1, page_size: 5 } });
        setSubs(resp.data.data.items);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetchSubs();
  }, [problemId, refreshKey]);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> 最近提交
        </CardTitle>
      </CardHeader>
      <CardContent className="py-0 pb-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> 加载中...
          </div>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">暂无提交记录</p>
        ) : (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {subs.map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-muted transition-colors text-sm"
                  onClick={() => onSelect(s)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-medium">{s.language}</Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(s.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[s.status] || "bg-zinc-100 dark:bg-zinc-800"}`}>
                    {s.status}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
