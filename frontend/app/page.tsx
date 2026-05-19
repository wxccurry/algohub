import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Code2, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          从<span className="text-primary">抽象代码</span>到<span className="text-primary">肉眼可见</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          AlgoHub 为大学生量身打造 —— 集动态算法可视化、多语言在线评测、开源笔记广场于一体的算法学习平台
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/problems">
            <Button size="lg">开始刷题 <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
          <Link href="/visualize">
            <Button size="lg" variant="outline">算法可视化</Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle>动态可视化</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            交互式算法动画，播放/暂停/单步/调速，让指针移动与数据结构变换肉眼可见
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Code2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle>多语言 OJ 评测</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Python / C++ / Java，Docker 沙箱安全评测，AC/WA/TLE/RE 实时反馈
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle>开源笔记广场</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            发布算法模板与刷题经验，点赞 / Star / Fork，构建你的开源知识库
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
