"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewPostPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("请先登录"); return; }
    setLoading(true);
    try {
      const resp = await api.post("/posts", {
        title, content, summary: summary || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_public: true,
      });
      toast.success("笔记发布成功！");
      router.push(`/posts/${resp.data.data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "发布失败";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/posts"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />返回</Button></Link>
        <h1 className="text-2xl font-bold">写笔记</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>发布新笔记</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题 *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="给你的笔记起个标题" required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">摘要</Label>
              <Input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)}
                placeholder="一句话概括内容（可选）" maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="算法, 动态规划, 蓝桥杯" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">内容 * (支持 Markdown)</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="使用 Markdown 格式记录笔记…" required rows={15} className="font-mono text-base" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              发布笔记
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
