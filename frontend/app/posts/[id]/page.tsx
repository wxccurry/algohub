"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, GitFork, Heart, Loader2, MessageCircle, Send } from "lucide-react";

interface PostData { id: number; author_id: number; title: string; content: string;
  summary: string | null; tags: string[] | null; stars_count: number; forks_count: number;
  views: number; forked_from: number | null; is_pinned: boolean; created_at: string; updated_at: string; }

interface CommentData { id: number; post_id: number; user_id: number; parent_id: number | null;
  content: string; created_at: string; replies: CommentData[]; }

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const [postResp, commentResp] = await Promise.all([
        api.get(`/posts/${id}`),
        api.get(`/posts/${id}/comments`),
      ]);
      setPost(postResp.data.data);
      setComments(commentResp.data.data);
    } catch { toast.error("笔记加载失败"); } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const handleStar = async () => {
    if (!user) { toast.error("请先登录"); return; }
    try {
      const resp = await api.post(`/posts/${id}/star`);
      setStarred(resp.data.data.starred);
      setPost((prev) => prev ? { ...prev, stars_count: resp.data.data.stars_count } : prev);
    } catch { toast.error("操作失败"); }
  };

  const handleFork = async () => {
    if (!user) { toast.error("请先登录"); return; }
    try {
      const resp = await api.post(`/posts/${id}/fork`);
      toast.success("Fork 成功！");
      router.push(`/posts/${resp.data.data.id}`);
    } catch { toast.error("Fork 失败"); }
  };

  const handleComment = async () => {
    if (!user) { toast.error("请先登录"); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${id}/comments`, { content: commentText, parent_id: replyTo });
      toast.success(replyTo ? "回复成功" : "评论成功");
      setCommentText("");
      setReplyTo(null);
      // Refresh comments
      const resp = await api.get(`/posts/${id}/comments`);
      setComments(resp.data.data);
    } catch { toast.error("评论失败"); } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto max-w-4xl px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 w-full" /><Skeleton className="h-24 w-full" />
    </div>;
  }
  if (!post) return <div className="text-center py-20 text-muted-foreground">笔记不存在</div>;

  const CommentsList = ({ items, depth = 0 }: { items: CommentData[]; depth?: number }) => (
    <div className={`space-y-3 ${depth > 0 ? "ml-6" : ""}`}>
      {items.map((c) => (
        <div key={c.id} className="border-l-2 pl-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">用户 #{c.user_id}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(c.created_at).toLocaleString("zh-CN")}
            </span>
          </div>
          <p className="text-sm">{c.content}</p>
          <button
            className="text-xs text-muted-foreground hover:text-primary mt-1"
            onClick={() => { setReplyTo(c.id); setCommentText(`@#${c.user_id} `); }}
          >
            回复
          </button>
          {c.replies && c.replies.length > 0 && <CommentsList items={c.replies} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/posts"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />返回</Button></Link>
        <h1 className="text-2xl font-bold">{post.title}</h1>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        {post.tags?.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
        <span>👁 {post.views}</span>
        <span>{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
        {post.forked_from && (
          <Link href={`/posts/${post.forked_from}`} className="text-primary hover:underline">
            派生自 #{post.forked_from}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Button variant={starred ? "default" : "outline"} size="sm" onClick={handleStar}>
          <Heart className={`h-4 w-4 mr-1 ${starred ? "fill-current" : ""}`} />
          {post.stars_count}
        </Button>
        <Button variant="outline" size="sm" onClick={handleFork}>
          <GitFork className="h-4 w-4 mr-1" />Fork ({post.forks_count})
        </Button>
      </div>

      <div className="border rounded-lg p-6 mb-8">
        <MarkdownRenderer content={post.content} />
      </div>

      <Separator className="my-8" />

      <div className="space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> 评论 ({comments.length})
        </h2>

        {user && (
          <div className="space-y-3">
            {replyTo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                回复 #{replyTo}
                <Button variant="ghost" size="sm" onClick={() => { setReplyTo(null); setCommentText(""); }}>取消</Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论…"
                rows={3}
                className="flex-1"
              />
              <Button onClick={handleComment} disabled={submitting || !commentText.trim()} className="self-end">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <CommentsList items={comments} />
      </div>
    </div>
  );
}
