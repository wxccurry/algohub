import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeftRight, BarChart3, Binary, GitBranch, Table2 } from "lucide-react";

const ALGORITHMS = [
  { slug: "two-pointers", name: "双指针 (Two Pointers)", desc: "在有序数组中寻找两数之和等于目标值", icon: ArrowLeftRight },
  { slug: "quick-sort", name: "快速排序 (Quick Sort)", desc: "分治思想: 选取 pivot 并分区递归排序", icon: BarChart3 },
  { slug: "binary-search", name: "二分查找 (Binary Search)", desc: "在有序数组中高效查找目标元素", icon: Binary, soon: true },
  { slug: "bfs", name: "广度优先搜索 (BFS)", desc: "图的层序遍历 — 最短路径基础算法", icon: GitBranch, soon: true },
  { slug: "dp-table", name: "动态规划 (DP Table)", desc: "状态转移表的逐步推演过程", icon: Table2, soon: true },
];

export default function VisualizePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">算法可视化</h1>
      <p className="text-muted-foreground mb-8">交互式动画演示 — 播放/暂停/单步/调速，让算法过程肉眼可见</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALGORITHMS.map((algo) => (
          <Link key={algo.slug} href={algo.soon ? "#" : `/visualize/${algo.slug}`} className={algo.soon ? "pointer-events-none" : ""}>
            <Card className={`hover:border-primary/50 transition-colors h-full ${algo.soon ? "opacity-50" : ""}`}>
              <CardHeader>
                <algo.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle>{algo.name}</CardTitle>
                <CardDescription>{algo.desc}</CardDescription>
              </CardHeader>
              {algo.soon && (
                <CardContent>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">即将推出</span>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
