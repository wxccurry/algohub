"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, CheckCircle, FileText, Loader2, Users, Plus, Upload, Search, Trash2, Edit3 } from "lucide-react";

interface Overview { total_users: number; total_problems: number; total_submissions: number; today_active_users: number; overall_ac_rate: number; }
interface ProblemStat { problem_id: number; title: string; difficulty: string; total_submissions: number; ac_count: number; ac_rate: number; }

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  tags: string[];
  is_public: boolean;
  description?: string;
  input_format?: string;
  output_format?: string;
  time_limit?: number;
  memory_limit?: number;
}

const STAT_CARDS = [
  { key: "total_users", label: "用户总数", icon: Users, color: "text-blue-500" },
  { key: "total_problems", label: "题目总数", icon: FileText, color: "text-green-500" },
  { key: "total_submissions", label: "总提交数", icon: Activity, color: "text-purple-500" },
  { key: "today_active_users", label: "今日活跃", icon: Users, color: "text-orange-500" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  "简单": "bg-green-100 text-green-700",
  "中等": "bg-yellow-100 text-yellow-700",
  "困难": "bg-red-100 text-red-700",
  "专家": "bg-purple-100 text-purple-700",
};

const EMPTY_FORM = {
  title: "",
  difficulty: "简单",
  tags: "",
  description: "",
  input_format: "",
  output_format: "",
  is_public: true,
};

export default function AdminPage() {
  const { user } = useAuthStore();

  // Dashboard state
  const [overview, setOverview] = useState<Overview | null>(null);
  const [analyticsProblems, setAnalyticsProblems] = useState<ProblemStat[]>([]);
  const [dashLoading, setDashLoading] = useState(true);

  // Problem management state
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "admin";
  const canManage = user?.role === "admin" || user?.role === "author";

  // ---- Dashboard fetch ----
  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      try {
        const [ov, ps] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/analytics/problems"),
        ]);
        setOverview(ov.data.data);
        setAnalyticsProblems(ps.data.data);
      } catch { /* ignore */ } finally {
        setDashLoading(false);
      }
    };
    fetchData();
  }, [isAdmin, user]);

  // ---- Problems fetch ----
  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: "20" };
      if (search) params.search = search;
      if (difficulty !== "all") params.difficulty = difficulty;
      const res = await api.get("/problems", { params });
      setProblems(res.data.data.items ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search, difficulty]);

  useEffect(() => {
    if (canManage) fetchProblems();
  }, [fetchProblems, canManage]);

  // ---- Create / Edit ----
  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post("/problems", {
        title: form.title,
        difficulty: form.difficulty,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: form.description,
        input_format: form.input_format,
        output_format: form.output_format,
        is_public: form.is_public,
      });
      toast.success("题目已创建");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      fetchProblems();
    } catch { toast.error("创建失败"); } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: Problem) => {
    setEditingProblem(p);
    setForm({
      title: p.title,
      difficulty: p.difficulty,
      tags: (p.tags ?? []).join(", "),
      description: p.description ?? "",
      input_format: p.input_format ?? "",
      output_format: p.output_format ?? "",
      is_public: p.is_public,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingProblem) return;
    setSaving(true);
    try {
      await api.put(`/problems/${editingProblem.id}`, {
        title: form.title,
        difficulty: form.difficulty,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: form.description,
        input_format: form.input_format,
        output_format: form.output_format,
        is_public: form.is_public,
      });
      toast.success("已更新");
      setEditOpen(false);
      setEditingProblem(null);
      fetchProblems();
    } catch { toast.error("更新失败"); } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    try {
      await api.delete(`/problems/${deletingId}`);
      toast.success("已删除");
      setDeleteOpen(false);
      setDeletingId(null);
      fetchProblems();
    } catch { toast.error("删除失败"); }
  };

  // ---- Import ----
  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const items = Array.isArray(data) ? data : data.problems;
        if (!items?.length) { toast.error("未找到题目数据"); return; }
        let imported = 0;
        for (const p of items) {
          try {
            await api.post("/problems", p);
            imported++;
          } catch { /* skip individual failures */ }
        }
        toast.success(`导入完成：${imported}/${items.length} 题`);
        fetchProblems();
      } catch { toast.error("导入失败，请检查 JSON 格式"); }
    };
    input.click();
  };

  // ---- Access control ----
  if (!canManage) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">无权访问管理页面</div>;
  }

  // ---- Chart data ----
  const chartData = analyticsProblems.slice(0, 20).map((p) => ({
    name: p.title.length > 8 ? p.title.slice(0, 8) + "..." : p.title,
    通过: p.ac_count,
    提交: p.total_submissions,
  }));

  // ---- Form helpers ----
  const updateForm = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const problemForm = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="p-title">标题</Label>
        <Input id="p-title" value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="题目标题" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>难度</Label>
          <Select value={form.difficulty} onValueChange={(v) => updateForm("difficulty", v ?? "easy")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="简单">简单</SelectItem>
              <SelectItem value="中等">中等</SelectItem>
              <SelectItem value="困难">困难</SelectItem>
              <SelectItem value="专家">专家</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>状态</Label>
          <Select value={form.is_public ? "public" : "hidden"} onValueChange={(v) => updateForm("is_public", v === "public")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">公开</SelectItem>
              <SelectItem value="hidden">隐藏</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p-tags">标签（逗号分隔）</Label>
        <Input id="p-tags" value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} placeholder="DP, 贪心, 图论" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p-desc">题目描述</Label>
        <Textarea id="p-desc" value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="题目描述（支持 Markdown）" rows={5} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="p-input">输入格式</Label>
          <Textarea id="p-input" value={form.input_format} onChange={(e) => updateForm("input_format", e.target.value)} placeholder="输入格式说明" rows={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-output">输出格式</Label>
          <Textarea id="p-output" value={form.output_format} onChange={(e) => updateForm("output_format", e.target.value)} placeholder="输出格式说明" rows={3} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">管理后台</h1>
          <TabsList>
            <TabsTrigger value="dashboard">看板</TabsTrigger>
            <TabsTrigger value="problems">题目管理</TabsTrigger>
          </TabsList>
        </div>

        {/* ==================== DASHBOARD TAB ==================== */}
        <TabsContent value="dashboard">
          {dashLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : !isAdmin ? (
            <div className="text-center py-20 text-muted-foreground">需要管理员权限查看看板数据</div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {overview && STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
                  <Card key={key}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overview[key as keyof Overview] || 0}</div>
                      {key === "total_submissions" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          通过率: {overview.overall_ac_rate}%
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Chart */}
              <Card className="mb-8">
                <CardHeader><CardTitle>题目提交统计</CardTitle></CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="提交" fill="#94a3b8" />
                        <Bar dataKey="通过" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-10">暂无数据</p>
                  )}
                </CardContent>
              </Card>

              {/* Problem Pass Rate Table */}
              <Card>
                <CardHeader><CardTitle>题目通过率</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 pr-4">#</th>
                          <th className="py-2 pr-4">题目标题</th>
                          <th className="py-2 pr-4">难度</th>
                          <th className="py-2 pr-4">提交</th>
                          <th className="py-2 pr-4">通过</th>
                          <th className="py-2">通过率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsProblems.map((p) => (
                          <tr key={p.problem_id} className="border-b last:border-0">
                            <td className="py-2 pr-4">{p.problem_id}</td>
                            <td className="py-2 pr-4">{p.title}</td>
                            <td className="py-2 pr-4"><Badge variant="secondary">{p.difficulty}</Badge></td>
                            <td className="py-2 pr-4">{p.total_submissions}</td>
                            <td className="py-2 pr-4 text-green-600">{p.ac_count}</td>
                            <td className="py-2">
                              <span className={p.ac_rate >= 50 ? "text-green-600" : p.ac_rate >= 20 ? "text-yellow-600" : "text-red-600"}>
                                {p.ac_rate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ==================== PROBLEM MANAGEMENT TAB ==================== */}
        <TabsContent value="problems">
          {/* Header actions */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">题目列表</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />导入 JSON
              </Button>
              <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />新建题目
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="搜索题目..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                onKeyDown={(e) => e.key === "Enter" && fetchProblems()}
              />
            </div>
            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v ?? "all"); setPage(1); }}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="简单">简单</SelectItem>
                <SelectItem value="中等">中等</SelectItem>
                <SelectItem value="困难">困难</SelectItem>
                <SelectItem value="专家">专家</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-2">共 {total} 题</div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="hidden md:grid grid-cols-[80px_1fr_80px_150px_80px_100px] gap-3 px-4 py-2 bg-muted text-sm font-medium">
                <span>ID</span><span>标题</span><span>难度</span><span>标签</span><span>状态</span><span>操作</span>
              </div>
              <div className="divide-y">
                {problems.length === 0 ? (
                  <div className="px-4 py-10 text-center text-muted-foreground">暂无题目</div>
                ) : (
                  problems.map((p) => (
                    <div key={p.id} className="grid grid-cols-[80px_1fr_80px] md:grid-cols-[80px_1fr_80px_150px_80px_100px] gap-3 px-4 py-2.5 items-center text-sm hover:bg-muted/30">
                      <span className="text-muted-foreground">{p.id}</span>
                      <span className="font-medium truncate">{p.title}</span>
                      <Badge className={`text-xs w-fit ${DIFFICULTY_COLORS[p.difficulty] || "bg-gray-100 text-gray-700"}`}>
                        {p.difficulty}
                      </Badge>
                      <span className="hidden md:flex flex-wrap gap-1">
                        {p.tags?.slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                        {p.tags?.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{p.tags.length - 3}</Badge>
                        )}
                      </span>
                      <span className={`text-xs ${p.is_public ? "text-green-600" : "text-muted-foreground"}`}>
                        {p.is_public ? "公开" : "隐藏"}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground self-center">第 {page} 页</span>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ==================== CREATE DIALOG ==================== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建题目</DialogTitle>
          </DialogHeader>
          {problemForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
              {saving ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT DIALOG ==================== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑题目</DialogTitle>
          </DialogHeader>
          {problemForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleEdit} disabled={saving || !form.title.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE DIALOG ==================== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除这道题目吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
