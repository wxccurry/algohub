"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckCircle, FileText, Star, TrendingUp, Zap } from "lucide-react";

interface Analytics { user_id: number; username: string; total_submissions: number; ac_count: number;
  ac_rate: number; solved_problems: number; streak_days: number; rating: number; }

interface Post { id: number; title: string; stars_count: number; created_at: string; }

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [aResp, pResp] = await Promise.all([
          api.get(`/admin/analytics/users/${user.id}`).catch(() => null),
          api.get("/posts", { params: { author_id: user.id, page_size: 10 } }),
        ]);
        if (aResp) setAnalytics(aResp.data.data);
        setPosts(pResp.data.data.items);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user) {
    return <div className="text-center py-20 text-muted-foreground">请先登录</div>;
  }

  if (loading) {
    return <div className="container mx-auto max-w-4xl px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-32" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
    </div>;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">我的后台</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rating</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><Zap className="h-5 w-5 text-yellow-500" />{analytics?.rating || 1500}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">已解决</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><BookOpen className="h-5 w-5 text-green-500" />{analytics?.solved_problems || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">通过率</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><CheckCircle className="h-5 w-5 text-blue-500" />{analytics?.ac_rate || 0}%</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">总提交</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><TrendingUp className="h-5 w-5 text-purple-500" />{analytics?.total_submissions || 0}</CardContent>
        </Card>
      </div>

      {/* My Posts */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />我的笔记</h2>
        <Link href="/posts/new"><Button size="sm">写笔记</Button></Link>
      </div>

      {posts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">暂无笔记，去写第一篇吧！</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/posts/${p.id}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{p.stars_count}</span>
                      <span>{new Date(p.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
