"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckCircle, FileText, Star, TrendingUp, Zap, Clock, Send, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Post { id: number; title: string; stars_count: number; created_at: string; }

const STATUS_COLORS: Record<string, string> = {
  Accepted: "text-green-600 bg-green-50", "Wrong Answer": "text-red-600 bg-red-50",
  "Time Limit Exceeded": "text-yellow-600 bg-yellow-50", "Runtime Error": "text-orange-600 bg-orange-50",
  Pending: "text-blue-600 bg-blue-50", Running: "text-purple-600 bg-purple-50",
};

const DIFF_COLORS: Record<string, string> = {
  "简单": "text-green-600", "中等": "text-yellow-600", "困难": "text-red-600", "专家": "text-purple-600",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, ac: 0, solved: 0, streak: 0, rating: 1500 });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [subResp, postResp, probResp] = await Promise.all([
          api.get("/user/submissions", { params: { page_size: 50 } }).catch(() => ({ data: { data: { items: [] } } })),
          api.get("/posts", { params: { author_id: user.id, post_type: "note", page_size: 10 } }).catch(() => ({ data: { data: { items: [] } } })),
          api.get("/problems", { params: { page_size: 100 } }).catch(() => ({ data: { data: { items: [] } } })),
        ]);
        const subs = subResp.data?.data?.items || [];
        setSubmissions(subs.slice(0, 10));
        const allSubs = subs;
        const acSubs = allSubs.filter((s: any) => s.status === "Accepted");
        const solvedIds = new Set(acSubs.map((s: any) => s.problem_id));
        setProblems(probResp.data?.data?.items || []);
        setPosts(postResp.data?.data?.items || []);
        setStats({
          total: allSubs.length,
          ac: acSubs.length,
          solved: solvedIds.size,
          streak: user?.profile?.streak_days || 0,
          rating: user?.profile?.rating || 1500,
        });
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, refreshKey]);

  const handleDeleteNote = async (postId: number) => {
    if (!confirm("确定要删除这条笔记吗？此操作不可撤销。")) return;
    try {
      await api.delete(`/posts/${postId}`);
      toast.success("笔记已删除");
      setRefreshKey(k => k + 1);
    } catch { toast.error("删除失败"); }
  };

  if (!user) {
    return <div className="text-center py-20 text-muted-foreground">请先登录</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const acRate = stats.total > 0 ? ((stats.ac / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">我的仪表盘</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">总提交</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-3xl font-bold">{stats.solved}</div>
                <div className="text-sm text-muted-foreground">已解决</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-3xl font-bold">{acRate}%</div>
                <div className="text-sm text-muted-foreground">通过率</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-3xl font-bold">{stats.rating}</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-4 w-4" />最近提交
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-base text-muted-foreground text-center py-6">还没有提交记录</p>
          ) : (
            <div className="divide-y">
              {submissions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-sm font-mono ${STATUS_COLORS[s.status] || ""}`}>
                      {s.status === "Accepted" ? "AC" : s.status === "Wrong Answer" ? "WA" : s.status === "Time Limit Exceeded" ? "TLE" : s.status === "Runtime Error" ? "RE" : s.status || "?"}
                    </Badge>
                    <span className="text-base">题目 #{s.problem_id}</span>
                    <Badge variant="outline" className="text-sm">{s.language}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {s.execution_time && <span>{s.execution_time}ms</span>}
                    {s.execution_memory && <span>{(s.execution_memory / 1024).toFixed(1)}MB</span>}
                    <span>{s.created_at ? new Date(s.created_at).toLocaleDateString("zh-CN") : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {submissions.length > 0 && (
            <div className="text-center mt-3">
              <Link href="/problems">
                <Button variant="outline" size="sm">继续刷题</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solved Problems */}
      {stats.solved > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="h-4 w-4" />已解决题目
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {problems.filter((p: any) => submissions.some((s: any) => s.problem_id === p.id && s.status === "Accepted")).slice(0, 20).map((p: any) => (
                <Link key={p.id} href={`/problems/${p.id || p.slug}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                    {p.title}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Posts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-4 w-4" />我的笔记
          </CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">还没有发布笔记</p>
              <Link href="/posts/new">
                <Button variant="outline" size="sm">写一篇笔记</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {posts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 hover:bg-muted/50 px-2 rounded transition-colors">
                  <Link href={`/posts/${p.id}`} className="flex-1 flex items-center justify-between">
                    <span className="text-base">{p.title}</span>
                    <div className="flex items-center gap-3 text-base text-muted-foreground">
                      <span><Star className="h-4 w-4 inline mr-0.5" />{p.stars_count}</span>
                      <span>{new Date(p.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDeleteNote(p.id)}
                    className="ml-3 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="删除笔记"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
