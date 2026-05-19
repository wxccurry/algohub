"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Code2, Users, Trophy, TrendingUp, Zap } from "lucide-react";
import api from "@/lib/api";

export default function HomePage() {
  const [stats, setStats] = useState({ problems: 0, submissions: 0, users: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/problems?page_size=1").then(r => r.data?.data?.total || 60),
      api.get("/admin/dashboard").catch(() => ({ data: { data: {} } })),
    ]).then(([problemCount, dashboard]) => {
      const d = dashboard.data?.data || {};
      setStats({
        problems: problemCount,
        submissions: d.total_submissions || 0,
        users: d.total_users || 0,
      });
    }).catch(() => {
      setStats({ problems: 60, submissions: 0, users: 0 });
    });
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          从<span className="text-primary">抽象代码</span>到<span className="text-primary">肉眼可见</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          AlgoHub 为大学生量身打造 —— 集动态算法可视化、多语言在线评测、AI 智能辅导、开源笔记广场于一体的算法学习平台
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/problems">
            <Button size="lg">开始刷题 <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">免费注册</Button>
          </Link>
        </div>

        {/* Live stats */}
        <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
          <div>
            <div className="text-3xl font-bold text-primary">{stats.problems}+</div>
            <div className="text-sm text-muted-foreground mt-1">精选题目</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">{stats.submissions}</div>
            <div className="text-sm text-muted-foreground mt-1">次评测</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">{stats.users}</div>
            <div className="text-sm text-muted-foreground mt-1">注册用户</div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle>动态可视化</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            交互式算法动画，播放/暂停/单步/调速，让指针移动与数据结构变换肉眼可见。
            覆盖双指针、排序、BFS、DP 填表等核心算法。
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <Code2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle>多语言 OJ 评测</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Python / C++ / Java 在线评测，Docker 沙箱安全隔离，
            AC/WA/TLE/RE 实时反馈，击败 X% 用户统计。
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>AI 智能辅导</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            AI 刷题导师，渐进式提示不直接给答案，苏格拉底式引导学习。
            错误分析帮你定位问题，让每道题都真正学会。
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle>开源笔记广场</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            发布算法模板与刷题经验，点赞 / Star / Fork，构建你的开源知识库。
            和社区一起成长。
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <Trophy className="h-8 w-8 text-primary mb-2" />
            <CardTitle>算法竞赛</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            ACM 赛制周赛，实时排名 + 罚时统计。和全国选手一决高下，
            赛后官方题解复盘提升。
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <TrendingUp className="h-8 w-8 text-primary mb-2" />
            <CardTitle>学习分析</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            打卡日历、刷题热力图、Rating 积分、语言分布统计，
            可视化你的学习进度和成长曲线。
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center border-t">
        <h2 className="text-2xl font-bold mb-4">准备好提升算法能力了吗？</h2>
        <p className="text-muted-foreground mb-6">加入数千名学习者，每天进步一点</p>
        <Link href="/register">
          <Button size="lg">免费注册开始刷题</Button>
        </Link>
      </section>
    </div>
  );
}
