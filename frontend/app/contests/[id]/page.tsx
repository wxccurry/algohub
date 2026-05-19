"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Trophy, UserPlus, CheckCircle, Hash, Users, Award, Zap } from "lucide-react";
import { toast } from "sonner";

interface ProblemItem { display_id: string; problem_id: number; title: string; difficulty: string; points: number; }
interface RankingEntry { rank: number; user_id: number; username: string; score: number; penalty: number; }

const DIFF_COLORS: Record<string, string> = {
  "简单": "bg-teal-100 text-teal-800", "中等": "bg-orange-100 text-orange-800",
  "困难": "bg-red-100 text-red-800", "专家": "bg-purple-100 text-purple-800",
};

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [contest, setContest] = useState<any>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState<"upcoming" | "ongoing" | "ended">("upcoming");

  const tick = useCallback(() => {
    if (!contest) return;
    const now = Date.now();
    const start = new Date(contest.start_time).getTime();
    const end = new Date(contest.end_time).getTime();
    if (now < start) { setStatus("upcoming"); const d = start - now; const h = Math.floor(d/3600000); const m = Math.floor((d%3600000)/60000); setTimeLeft(`${h}时${m}分后开始`); }
    else if (now <= end) { setStatus("ongoing"); const d = end - now; const h = Math.floor(d/3600000); const m = Math.floor((d%3600000)/60000); setTimeLeft(`剩余 ${h}时${m}分`); }
    else { setStatus("ended"); setTimeLeft("已结束"); }
  }, [contest]);

  useEffect(() => {
    api.get(`/v1/contests/${id}`).then(r => { if (r.data?.data) setContest(r.data.data); }).catch(()=>{});
    api.get(`/v1/contests/${id}/ranking`).then(r => { if (r.data?.data) setRanking(r.data.data); }).catch(()=>{});
    setLoading(false);
  }, [id]);

  useEffect(() => { tick(); const i = setInterval(tick, 1000); return () => clearInterval(i); }, [tick]);

  async function handleRegister() {
    if (!user) { toast.error("请先登录"); return; }
    setRegistering(true);
    try { await api.post(`/v1/contests/${id}/register`); setRegistered(true); toast.success("报名成功！"); }
    catch (e: any) { toast.error(e?.response?.data?.message || "报名失败"); }
    finally { setRegistering(false); }
  }

  function fmt(dt: string) { return new Date(dt).toLocaleString("zh-CN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }); }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8 space-y-6"><Skeleton className="h-12 w-80"/><Skeleton className="h-6 w-full"/><Skeleton className="h-48 w-full rounded-xl"/><Skeleton className="h-64 w-full rounded-xl"/></div>;
  }
  if (!contest) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-muted-foreground"><Trophy className="h-12 w-12 mx-auto mb-3 opacity-30"/><p className="text-lg">比赛不存在</p></div>;
  }

  const problems = contest.problems || [];
  const participantCount = contest.participant_count || 0;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Top banner — LeetCode style */}
      <div className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{contest.title}</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">{contest.description || "暂无描述"}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/>{fmt(contest.start_time)} — {fmt(contest.end_time)}</span>
                <span className="flex items-center gap-1.5"><Badge variant="outline" className="text-xs">{contest.rule_type.toUpperCase()}</Badge></span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4"/>{participantCount} 人报名</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={status === "ongoing" ? "default" : status === "upcoming" ? "secondary" : "outline"} className="text-sm px-4 py-1.5">
                <Clock className="h-4 w-4 mr-1.5"/>{timeLeft}
              </Badge>
              {status !== "ended" && (
                <Button onClick={handleRegister} disabled={registered || registering} size="sm" className="mt-1">
                  {registered ? <><CheckCircle className="h-4 w-4 mr-1"/>已报名</> : <><UserPlus className="h-4 w-4 mr-1"/>报名参赛</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Problem list */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">题目列表</CardTitle></CardHeader>
              <CardContent>
                {problems.length > 0 ? (
                  <div className="space-y-1.5">
                    {problems.map((p: ProblemItem) => {
                      const isLocked = status === "upcoming";
                      return (
                        <div key={p.display_id}
                          onClick={() => { if (!isLocked) router.push(`/problems/${p.problem_id}`); }}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                            isLocked ? "cursor-not-allowed opacity-70" : "hover:bg-muted/50 cursor-pointer group"
                          }`}>
                          <Badge variant="secondary" className="font-mono text-sm w-8 h-7 flex items-center justify-center shrink-0">{p.display_id}</Badge>
                          <span className={`text-sm flex-1 ${!isLocked && "group-hover:text-primary transition-colors"} ${isLocked ? "font-medium" : "font-medium"}`}>
                            {isLocked ? `题目 ${p.display_id}` : p.title}
                          </span>
                          {isLocked ? (
                            <Badge variant="outline" className="text-xs">???</Badge>
                          ) : (
                            <Badge className={`text-xs ${DIFF_COLORS[p.difficulty] || ""}`}>{p.difficulty}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground w-14 text-right">{p.points} 分</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">暂未公布题目</p>
                )}
                {status === "upcoming" && problems.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">🔒 题目将在比赛开始时公布</p>
                )}
              </CardContent>
            </Card>

            {/* Ranking */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500"/>排行榜</CardTitle></CardHeader>
              <CardContent>
                {ranking.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left w-12 font-medium">#</th><th className="py-2 text-left font-medium">选手</th><th className="py-2 text-right w-20 font-medium">得分</th><th className="py-2 text-right w-20 font-medium">罚时</th></tr></thead>
                    <tbody>
                      {ranking.map(r => (
                        <tr key={r.user_id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2.5 font-mono font-bold">{r.rank <= 3 ? <span className={r.rank===1?"text-amber-500":r.rank===2?"text-slate-400":"text-orange-600"}>{r.rank}</span> : r.rank}</td>
                          <td className="py-2.5 font-medium">{r.username}</td>
                          <td className="py-2.5 text-right">{r.score}</td>
                          <td className="py-2.5 text-right font-mono">{r.penalty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">暂无排名 — 比赛开始后更新</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar — Rules + Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4"/>赛制规则</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1.5">
                <p><strong>赛制：</strong>{contest.rule_type === "acm" ? "ACM 赛制" : "IOI 赛制"}</p>
                {contest.rule_type === "acm" ? (
                  <>
                    <p>• 实时判题，错误提交罚时 20 分钟</p>
                    <p>• 按通过题数排名，题数相同按罚时</p>
                    <p>• 比赛期间可多次提交</p>
                  </>
                ) : (
                  <>
                    <p>• 每题独立计分，部分分制</p>
                    <p>• 按总分排名</p>
                    <p>• 不设罚时</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4"/>参赛须知</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1.5">
                <p>• 诚信参赛，禁止作弊和代码抄袭</p>
                <p>• 比赛结束后可查看他人代码</p>
                <p>• Rating 积分将在赛后更新</p>
                <p>• 每题有独立的分数和时间限制</p>
              </CardContent>
            </Card>

            {problems.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">题目分值</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {problems.map((p: ProblemItem) => (
                    <div key={p.display_id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5"><Badge variant="secondary" className="font-mono w-6 h-5 flex items-center justify-center text-xs">{p.display_id}</Badge>{p.title.slice(0,8)}</span>
                      <span className="text-muted-foreground">{p.points}分</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
