"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const DIFFICULTIES = ["", "easy", "medium", "hard", "expert"];
const DIFFICULTY_LABELS: Record<string, string> = { easy: "简单", medium: "中等", hard: "困难", expert: "专家" };
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expert: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

interface Problem {
  id: number; title: string; difficulty: string; difficulty_score: number;
  tags: string[]; source: string | null; is_public: boolean; version: number;
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: pageSize };
      if (difficulty) params.difficulty = difficulty;
      if (search) params.search = search;
      const resp = await api.get("/problems", { params });
      setProblems(resp.data.data.items);
      setTotal(resp.data.data.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, pageSize, difficulty, search]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">题库</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索题目..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={difficulty} onValueChange={(v) => { setDifficulty(v ?? ""); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="难度筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部难度</SelectItem>
            {DIFFICULTIES.filter(Boolean).map((d) => (
              <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">加载中...</div>
      ) : problems.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">暂无题目</div>
      ) : (
        <div className="space-y-3">
          {problems.map((p) => (
            <Link key={p.id} href={`/problems/${p.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{p.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${DIFFICULTY_COLORS[p.difficulty] || ""}`}>
                        {DIFFICULTY_LABELS[p.difficulty] || p.difficulty}
                      </span>
                      {p.difficulty_score > 0 && (
                        <span className="text-xs text-muted-foreground">{p.difficulty_score}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-1 flex-wrap">
                  {p.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                  {p.source && <Badge variant="outline" className="text-xs">{p.source}</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
