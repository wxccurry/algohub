"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TwoPointersViz from "@/components/visualization/algorithms/TwoPointers";
import QuickSortViz from "@/components/visualization/algorithms/QuickSort";

const COMPONENTS: Record<string, React.ComponentType> = {
  "two-pointers": TwoPointersViz,
  "quick-sort": QuickSortViz,
};

const TITLES: Record<string, string> = {
  "two-pointers": "双指针 (Two Pointers)",
  "quick-sort": "快速排序 (Quick Sort)",
};

const PSEUDOCODE: Record<string, string> = {
  "two-pointers": `\`\`\`
left = 0, right = n - 1
while left <= right:
    sum = arr[left] + arr[right]
    if sum == target:
        return [left, right]
    elif sum < target:
        left++        # 和太小，左指针右移
    else:
        right--       # 和太大，右指针左移
\`\`\``,
  "quick-sort": `\`\`\`
def quicksort(arr, lo, hi):
    if lo < hi:
        p = partition(arr, lo, hi)
        quicksort(arr, lo, p - 1)
        quicksort(arr, p + 1, hi)

def partition(arr, lo, hi):
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] < pivot:
            swap(arr[i], arr[j])
            i++
    swap(arr[i], arr[hi])
    return i
\`\`\``,
};

export default function AlgorithmPage() {
  const { algorithm } = useParams<{ algorithm: string }>();
  const VizComponent = COMPONENTS[algorithm || ""];
  const title = TITLES[algorithm || ""] || algorithm;

  if (!VizComponent) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        算法 "{algorithm}" 尚未实现可视化
        <div className="mt-4">
          <Link href="/visualize"><Button><ArrowLeft className="mr-2 h-4 w-4" />返回列表</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/visualize">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />返回</Button>
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VizComponent />
        </div>
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-2">伪代码</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-xs whitespace-pre-wrap">
                {PSEUDOCODE[algorithm || ""]?.replace(/```\n?/g, "") || "暂无"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
