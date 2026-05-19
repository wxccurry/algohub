"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Trophy, UserPlus, CheckCircle, Hash } from "lucide-react";
import { toast } from "sonner";

interface ContestDetail {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  rule_type: string;
  is_public?: boolean;
  problems?: { display_id: string; title: string; problem_id: number }[];
}

interface RankingEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
  penalty: number;
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState<"upcoming" | "ongoing" | "ended">("upcoming");

  const fetchContest = useCallback(async () => {
    try {
      const res = await api.get(`/v1/contests/${id}`);
      if (res.data?.data) setContest(res.data.data);
    } catch {}
  }, [id]);

  const fetchRanking = useCallback(async () => {
    try {
      const res = await api.get(`/v1/contests/${id}/ranking`);
      if (res.data?.data) setRanking(res.data.data);
    } catch {}
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContest(), fetchRanking()]).finally(() => setLoading(false));
  }, [fetchContest, fetchRanking]);

  useEffect(() => {
    if (!contest) return;

    const tick = () => {
      const now = Date.now();
      const start = new Date(contest.start_time).getTime();
      const end = new Date(contest.end_time).getTime();

      if (now < start) {
        setStatus("upcoming");
        const diff = start - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      } else if (now >= start && now <= end) {
        setStatus("ongoing");
        const diff = end - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      } else {
        setStatus("ended");
        setTimeLeft("已结束");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  async function handleRegister() {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    setRegistering(true);
    try {
      await api.post(`/v1/contests/${id}/register`);
      setRegistered(true);
      toast.success("报名成功！");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "报名失败";
      toast.error(msg);
    } finally {
      setRegistering(false);
    }
  }

  function formatTime(dt: string) {
    return new Date(dt).toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">比赛不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contest.title}</h1>
          <p className="text-muted-foreground mt-2">
            {contest.description || "暂无描述"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "ended" ? (
            <Badge variant="outline" className="text-sm px-3 py-1">
              已结束
            </Badge>
          ) : (
            <Badge
              variant={status === "ongoing" ? "default" : "secondary"}
              className="text-sm px-3 py-1"
            >
              {status === "ongoing" ? "进行中" : "即将开始"}
            </Badge>
          )}
          {status !== "ended" && (
            <Button
              onClick={handleRegister}
              disabled={registered || registering}
              size="sm"
            >
              {registered ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" /> 已报名
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" /> 报名参赛
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Timer */}
      <Card>
        <CardContent className="py-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(contest.start_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(contest.end_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-primary">
            <Hash className="h-4 w-4" />
            <span>
              {status === "upcoming"
                ? `距开始: ${timeLeft}`
                : status === "ongoing"
                ? `距结束: ${timeLeft}`
                : timeLeft}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {contest.rule_type.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      {/* Problem list + Ranking side-by-side on larger screens */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Problems */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-muted-foreground">#</span> 题目列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contest.problems && contest.problems.length > 0 ? (
              <div className="space-y-1">
                {contest.problems.map((p) => (
                  <div
                    key={p.display_id}
                    onClick={() => router.push(`/problems/${p.problem_id}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Badge variant="secondary" className="font-mono text-xs w-7 h-6 flex items-center justify-center">
                        {p.display_id}
                      </Badge>
                      <span className="text-sm">{p.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                暂无题目
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ranking */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              排行榜
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="py-2 text-left w-16 font-medium">#</th>
                    <th className="py-2 text-left font-medium">用户</th>
                    <th className="py-2 text-right font-medium">得分</th>
                    <th className="py-2 text-right font-medium">罚时</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.user_id} className="border-b last:border-0">
                      <td className="py-2.5 font-mono font-bold">
                        {r.rank <= 3 ? (
                          <span
                            className={
                              r.rank === 1
                                ? "text-amber-500"
                                : r.rank === 2
                                ? "text-slate-400"
                                : "text-orange-600"
                            }
                          >
                            {r.rank}
                          </span>
                        ) : (
                          r.rank
                        )}
                      </td>
                      <td className="py-2.5 font-medium">{r.username}</td>
                      <td className="py-2.5 text-right">{r.score}</td>
                      <td className="py-2.5 text-right font-mono text-sm">
                        {r.penalty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                暂无排名数据
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
