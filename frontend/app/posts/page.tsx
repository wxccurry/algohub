"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, GitFork, Eye, Search, PenLine } from "lucide-react";

interface Post {
  id: number; author_id: number; title: string; summary: string | null;
  tags: string[] | null; stars_count: number; forks_count: number; views: number;
  is_pinned: boolean; created_at: string;
}

export default function PostsPage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: pageSize, sort };
      if (search) params.search = search;
      const resp = await api.get("/posts", { params });
      setPosts(resp.data.data.items);
      setTotal(resp.data.data.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, search]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">AlgoShare 广场</h1>
        {user && (
          <Link href="/posts/new">
            <Button><PenLine className="h-4 w-4 mr-2" />写笔记</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索笔记..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v ?? "latest"); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">最新</SelectItem>
            <SelectItem value="hot">最热</SelectItem>
            <SelectItem value="pinned">精选</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">暂无笔记</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <Link key={p.id} href={`/posts/${p.id}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {p.is_pinned && <Badge className="text-sm">📌 精选</Badge>}
                    <CardTitle className="text-lg">{p.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-base text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{p.stars_count}</span>
                    <span className="flex items-center gap-1"><GitFork className="h-4 w-4" />{p.forks_count}</span>
                    <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{p.views}</span>
                    <span>{new Date(p.created_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                </CardHeader>
                {p.summary && <CardContent><p className="text-muted-foreground text-base line-clamp-2">{p.summary}</p></CardContent>}
                {p.tags && p.tags.length > 0 && (
                  <CardContent className="pt-0"><div className="flex gap-1 flex-wrap">
                    {p.tags.map((t) => <Badge key={t} variant="secondary" className="text-sm">{t}</Badge>)}
                  </div></CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="text-base text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
