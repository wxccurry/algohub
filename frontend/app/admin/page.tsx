"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, CheckCircle, FileText, Loader2, Users } from "lucide-react";

interface Overview { total_users: number; total_problems: number; total_submissions: number; today_active_users: number; overall_ac_rate: number; }
interface ProblemStat { problem_id: number; title: string; difficulty: string; total_submissions: number; ac_count: number; ac_rate: number; }

const STAT_CARDS = [
  { key: "total_users", label: "用户总数", icon: Users, color: "text-blue-500" },
  { key: "total_problems", label: "题目总数", icon: FileText, color: "text-green-500" },
  { key: "total_submissions", label: "总提交数", icon: Activity, color: "text-purple-500" },
  { key: "today_active_users", label: "今日活跃", icon: Users, color: "text-orange-500" },
];

export default function AdminPage() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [problems, setProblems] = useState<ProblemStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ov, ps] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/analytics/problems"),
        ]);
        setOverview(ov.data.data);
        setProblems(ps.data.data);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    if (user?.role === "admin") fetchData();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user || user.role !== "admin") {
    return <div className="text-center py-20 text-muted-foreground">无权访问</div>;
  }

  const chartData = problems.slice(0, 20).map((p) => ({
    name: p.title.length > 8 ? p.title.slice(0, 8) + "…" : p.title,
    通过: p.ac_count,
    提交: p.total_submissions,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">管理看板</h1>

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

      {/* Problem Table */}
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
                {problems.map((p) => (
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
    </div>
  );
}
