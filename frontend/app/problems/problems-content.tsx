"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw } from "lucide-react";
import api from "@/lib/api";

const DIFFICULTIES = ["all", "简单", "中等", "困难", "专家"];
const DIFFICULTY_LABELS: Record<string, string> = {
  all: "全部难度", 简单: "简单", 中等: "中等", 困难: "困难", 专家: "专家",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  简单: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  中等: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  困难: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
  专家: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
};
const ALGORITHM_TAGS = [
  "数组", "字符串", "哈希表", "动态规划",
  "树", "图", "链表", "栈", "队列",
  "二分查找", "双指针", "贪心", "回溯", "排序",
  "滑动窗口", "前缀和", "并查集", "拓扑排序", "最短路",
];

interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  accept_count: number;
  submit_count: number;
  tags: string[];
  status?: string;
}

const SCROLL_STORAGE_KEY = "problems_scroll";
const FILTERS_STORAGE_KEY = "problems_filters";

export default function ProblemsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [selectedTag, setSelectedTag] = useState(searchParams.get("tag") || "");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [initialScrollRestored, setInitialScrollRestored] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Restore saved filters from sessionStorage on mount (for back-navigation)
  useEffect(() => {
    const savedFilters = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.search) setSearch(filters.search);
        if (filters.difficulty) setDifficulty(filters.difficulty);
        if (filters.status) setStatusFilter(filters.status);
        if (filters.tag) setSelectedTag(filters.tag);
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  const fetchProblems = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          page: String(pageNum),
          page_size: "30",
        };
        if (search) params.search = search;
        if (difficulty !== "all") params.difficulty = difficulty;
        if (statusFilter !== "all") params.status = statusFilter;
        if (selectedTag) params.tag = selectedTag;
        const res = await api.get("/problems", { params });
        const data = res.data.data;
        if (append) {
          setProblems((prev) => [...prev, ...data.items]);
        } else {
          setProblems(data.items);
        }
        setTotalCount(data.total);
        setHasMore(data.items.length === 30);
        setFetchError(false);
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    },
    [search, difficulty, statusFilter, selectedTag]
  );

  // Fetch on filter change
  useEffect(() => {
    setPage(1);
    fetchProblems(1, false);
  }, [fetchProblems]);

  // Restore scroll position after initial data load
  useEffect(() => {
    if (!loading && problems.length > 0 && !initialScrollRestored) {
      const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedScroll) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedScroll, 10));
        });
      }
      setInitialScrollRestored(true);
    }
  }, [loading, problems.length, initialScrollRestored]);

  // Save scroll position and filters on scroll (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
        sessionStorage.setItem(
          FILTERS_STORAGE_KEY,
          JSON.stringify({ search, difficulty, status: statusFilter, tag: selectedTag })
        );
      }, 150);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [search, difficulty, statusFilter, selectedTag]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => {
            const nextPage = p + 1;
            fetchProblems(nextPage, true);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );
    const current = observerRef.current;
    if (current) observer.observe(current);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchProblems]);

  const acRate = (p: Problem) =>
    p.submit_count > 0
      ? ((p.accept_count / p.submit_count) * 100).toFixed(1)
      : "0.0";

  const handleReset = () => {
    setSearch("");
    setDifficulty("all");
    setStatusFilter("all");
    setSelectedTag("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">题库</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索题目..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProblems(1, false)}
          />
        </div>
        <Select
          value={difficulty}
          onValueChange={(v) => {
            setDifficulty(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="todo">未做</SelectItem>
            <SelectItem value="attempted">尝试过</SelectItem>
            <SelectItem value="solved">已解决</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">标签:</span>
        {ALGORITHM_TAGS.map((tag) => (
          <Badge
            key={tag}
            variant={selectedTag === tag ? "default" : "outline"}
            className="cursor-pointer text-sm"
            onClick={() => {
              setSelectedTag(selectedTag === tag ? "" : tag);
              setPage(1);
            }}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {fetchError && problems.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">加载失败，请刷新重试</p>
          <Button variant="outline" onClick={() => fetchProblems(1, false)}>
            重试
          </Button>
        </div>
      )}

      <div className="text-base text-muted-foreground mb-2">
        共 {totalCount} 题
      </div>

      {/* Table Header */}
      <div className="hidden md:grid grid-cols-[40px_1fr_80px_100px_200px] gap-2 px-3 py-2 text-base font-medium text-muted-foreground border-b">
        <span>#</span>
        <span>标题</span>
        <span>难度</span>
        <span>通过率</span>
        <span>标签</span>
      </div>

      {/* Problem Rows */}
      <div className="divide-y">
        {problems.map((p) => (
          <div
            key={p.id}
            onClick={() => router.push(`/problems/${p.id}`)}
            className="grid grid-cols-[40px_1fr_80px_100px] md:grid-cols-[40px_1fr_80px_100px_200px] gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors duration-150 items-center"
          >
            {/* Status badge / ID */}
            <span className="text-sm text-muted-foreground">
              {p.status === "solved" ? (
                <span title="已解决">&#x2705;</span>
              ) : p.status === "attempted" ? (
                <span title="尝试过">&#x274C;</span>
              ) : (
                p.id
              )}
            </span>

            {/* Title */}
            <span className="text-base font-medium truncate hover:text-primary transition-colors">
              {p.title}
            </span>

            {/* Difficulty */}
            <span>
              <Badge
                variant="outline"
                className={`text-sm ${DIFFICULTY_COLORS[p.difficulty] || ""}`}
              >
                {DIFFICULTY_LABELS[p.difficulty] || p.difficulty}
              </Badge>
            </span>

            {/* Accept Rate */}
            <span className="text-sm text-muted-foreground">{acRate(p)}%</span>

            {/* Tags (hidden on mobile) */}
            <span className="hidden md:flex flex-wrap gap-1">
              {p.tags?.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-sm">
                  {t}
                </Badge>
              ))}
            </span>
          </div>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={observerRef} className="h-10" />

      {!hasMore && problems.length > 0 && (
        <p className="text-center text-base text-muted-foreground py-4">
          已加载全部题目
        </p>
      )}
    </div>
  );
}
