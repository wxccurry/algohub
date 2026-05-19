"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Trophy, Users } from "lucide-react";

interface Contest {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  rule_type: string;
  is_public?: boolean;
  participant_count?: number;
  problem_count?: number;
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/v1/contests/")
      .then((res) => {
        if (res.data?.data) setContests(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  const upcoming = contests.filter((c) => new Date(c.start_time) > now);
  const ongoing = contests.filter(
    (c) => new Date(c.start_time) <= now && new Date(c.end_time) >= now
  );
  const past = contests.filter((c) => new Date(c.end_time) < now);

  function formatTime(dt: string) {
    return new Date(dt).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderCard(c: Contest) {
    const isUpcoming = new Date(c.start_time) > now;
    const isOngoing =
      new Date(c.start_time) <= now && new Date(c.end_time) >= now;

    return (
      <Link key={c.id} href={`/contests/${c.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg leading-snug">{c.title}</CardTitle>
              <Badge
                variant={isOngoing ? "default" : isUpcoming ? "secondary" : "outline"}
              >
                {isOngoing ? "进行中" : isUpcoming ? "即将开始" : "已结束"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatTime(c.start_time)} - {formatTime(c.end_time)}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="text-xs">
                <Trophy className="h-3 w-3 mr-1" />
                {c.rule_type.toUpperCase()}
              </Badge>
              {c.participant_count !== undefined && (
                <span className="flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  {c.participant_count}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">比赛</h1>
        <Link href="/contests?create=1">
          <Button disabled className="text-sm">创建比赛</Button>
        </Link>
      </div>

      {ongoing.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            进行中
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ongoing.map(renderCard)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            即将开始
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(renderCard)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            往期比赛
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map(renderCard)}
          </div>
        </section>
      )}

      {contests.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">暂无比赛</p>
          <p className="text-sm mt-1">比赛上线后这里会展示所有公开赛事</p>
        </div>
      )}
    </div>
  );
}
