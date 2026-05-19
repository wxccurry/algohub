"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SettingsModal from "@/components/settings/SettingsModal";
import { BookOpen, Edit3, Star, TrendingUp, UserPlus, Zap } from "lucide-react";

interface Profile {
  id: number; username: string; role: string; created_at: string;
  profile: {
    avatar: string | null; nickname: string | null; bio: string | null;
    school: string | null; major: string | null; organization: string | null;
    solved_count: number; rating: number; streak_days: number;
  };
}

interface Post { id: number; title: string; stars_count: number; created_at: string; }

function HeatmapSection({ username }: { username: string }) {
  const [checkins, setCheckins] = useState<Record<string, number>>({});
  const [checkinLoading, setCheckinLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${username}/checkins`).then(r => {
      const data = r.data?.data?.checkins || {};
      setCheckins(data);
    }).catch(() => {}).finally(() => setCheckinLoading(false));
  }, [username]);

  const cells = useMemo(() => {
    const days = 365;
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: d, count: checkins[key] || 0 };
    });
  }, [checkins]);

  // Pad so the first cell aligns with Monday (GitHub-style)
  const firstDay = cells[0].date.getDay(); // 0=Sun
  const padStart = firstDay === 0 ? 6 : firstDay - 1;
  const paddedCells = useMemo(
    () => [...Array<null>(padStart).fill(null), ...cells],
    [cells, padStart],
  );

  function cellColor(count: number) {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800";
    if (count <= 2) return "bg-green-200 dark:bg-green-900";
    if (count <= 4) return "bg-green-400 dark:bg-green-600";
    return "bg-green-600 dark:bg-green-400";
  }

  const CELL_SIZE = 12;
  const GAP = 2;
  const columns = Math.ceil(paddedCells.length / 7);

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">活动热力图</CardTitle>
        <p className="text-xs text-muted-foreground">
          过去 365 天的刷题打卡记录（模拟数据）
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
              gridAutoFlow: "column",
              gap: `${GAP}px`,
              width: columns * (CELL_SIZE + GAP) + "px",
            }}
          >
            {paddedCells.map((cell, idx) => {
              if (!cell) return <div key={`pad-${idx}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
              const dateStr = cell.date.toISOString().slice(0, 10);
              return (
                <div
                  key={dateStr}
                  className={`rounded-sm ${cellColor(cell.count)}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  title={`${dateStr}: ${cell.count} 次打卡`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <span>少</span>
            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" />
            <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
            <span>多</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserPage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exists, setExists] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isMe = me?.username === username;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profileResp = await api.get(`/users/${username}`);
      if (profileResp.data.code === 404 || !profileResp.data.data) {
        setExists(false);
        return;
      }
      setProfile(profileResp.data.data);
      if (profileResp.data.data?.id) {
        const pResp = await api.get("/posts", { params: { author_id: profileResp.data.data.id, page_size: 10 } });
        setPosts(pResp.data.data.items);
      }
    } catch {
      setExists(false);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return <div className="container mx-auto max-w-4xl px-4 py-8 space-y-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-64" />
    </div>;
  }

  if (!profile || !exists) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center">
        <UserPlus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">@{username} 暂未加入</h1>
        <p className="text-muted-foreground mb-6">该用户还没有注册 AlgoHub，邀请 TA 一起刷题吧</p>
        <Link href="/register">
          <Button size="lg">立即注册加入</Button>
        </Link>
      </div>
    );
  }

  const p = profile.profile;
  const isEmpty = !p.nickname && !p.bio && !p.school;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              <AvatarImage src={p.avatar || undefined} />
              <AvatarFallback className="text-2xl font-bold">{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {p.nickname || profile.username}
                </h1>
                <Badge variant="secondary" className="text-xs">
                  {profile.role === "admin" ? "管理员" : profile.role === "author" ? "作者" : "用户"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-0.5">
                @{profile.username}
                {p.school && ` · ${profile.profile.school}`}
                {p.major && ` · ${profile.profile.major}`}
                {p.organization && ` · ${profile.profile.organization}`}
              </p>
              {p.bio && (
                <p className="text-muted-foreground text-sm mt-2 italic">"{profile.profile.bio}"</p>
              )}
              {isEmpty && (
                <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isMe ? "你的个人主页还是空的" : "TA 还没有填写个人资料"}
                  </p>
                  {isMe && (
                    <Button size="sm" onClick={() => setSettingsOpen(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />完善信息
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <div className="text-xl font-bold">{p.rating || 1500}</div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
            <div className="text-center">
              <BookOpen className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <div className="text-xl font-bold">{p.solved_count || 0}</div>
              <div className="text-xs text-muted-foreground">已解决</div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-1" />
              <div className="text-xl font-bold">{p.streak_days || 0}</div>
              <div className="text-xs text-muted-foreground">连续天数</div>
            </div>
            <div className="text-center">
              <Star className="h-6 w-6 text-purple-500 mx-auto mb-1" />
              <div className="text-xl font-bold">{posts.length}</div>
              <div className="text-xs text-muted-foreground">笔记数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <HeatmapSection username={username as string} />

      <h2 className="text-xl font-semibold mb-4">📝 TA 的笔记</h2>
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>还没有发布笔记</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/posts/${p.id}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3" />{p.stars_count}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {isMe && <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); fetchProfile(); }} />}
    </div>
  );
}
