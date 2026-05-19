"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TwoPointersViz from "@/components/visualization/algorithms/TwoPointers";
import QuickSortViz from "@/components/visualization/algorithms/QuickSort";
import BinarySearchViz from "@/components/visualization/algorithms/BinarySearch";
import BFSViz from "@/components/visualization/algorithms/BFS";
import DPTableViz from "@/components/visualization/algorithms/DPTable";

// ---------------------------------------------------------------------------
// Real, compilable code implementations in Python, C++, and Java
// ---------------------------------------------------------------------------
const CODE_SNIPPETS: Record<string, Record<string, string>> = {
  "two-pointers": {
    python: `def two_sum(arr: list[int], target: int) -> list[int]:
    """Find two numbers in sorted array that sum to target."""
    left, right = 0, len(arr) - 1
    while left < right:
        curr = arr[left] + arr[right]
        if curr == target:
            return [left, right]
        elif curr < target:
            left += 1
        else:
            right -= 1
    return [-1, -1]


if __name__ == "__main__":
    arr = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    print(two_sum(arr, 14))  # [5, 7] (indices of 5+9)`,
    cpp: `#include <vector>
#include <iostream>
using namespace std;

vector<int> twoSum(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left < right) {
        int curr = arr[left] + arr[right];
        if (curr == target) return {left, right};
        else if (curr < target) left++;
        else right--;
    }
    return {-1, -1};
}

int main() {
    vector<int> arr = {1, 3, 5, 7, 9, 11, 13, 15, 17, 19};
    auto res = twoSum(arr, 14);
    cout << "[" << res[0] << ", " << res[1] << "]" << endl;
    return 0;
}`,
    java: `import java.util.Arrays;

public class TwoSum {
    public static int[] twoSum(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        while (left < right) {
            int curr = arr[left] + arr[right];
            if (curr == target) return new int[]{left, right};
            else if (curr < target) left++;
            else right--;
        }
        return new int[]{-1, -1};
    }

    public static void main(String[] args) {
        int[] arr = {1, 3, 5, 7, 9, 11, 13, 15, 17, 19};
        int[] res = twoSum(arr, 14);
        System.out.println(Arrays.toString(res));
    }
}`,
  },

  "quick-sort": {
    python: `def quicksort(arr: list[int], lo: int, hi: int) -> None:
    if lo < hi:
        p = partition(arr, lo, hi)
        quicksort(arr, lo, p - 1)
        quicksort(arr, p + 1, hi)


def partition(arr: list[int], lo: int, hi: int) -> int:
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] < pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    return i


if __name__ == "__main__":
    arr = [38, 27, 43, 3, 9, 82, 10, 15, 55, 21]
    quicksort(arr, 0, len(arr) - 1)
    print(arr)`,
    cpp: `#include <vector>
#include <iostream>
using namespace std;

int partition(vector<int>& arr, int lo, int hi) {
    int pivot = arr[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (arr[j] < pivot) {
            swap(arr[i], arr[j]);
            i++;
        }
    }
    swap(arr[i], arr[hi]);
    return i;
}

void quicksort(vector<int>& arr, int lo, int hi) {
    if (lo < hi) {
        int p = partition(arr, lo, hi);
        quicksort(arr, lo, p - 1);
        quicksort(arr, p + 1, hi);
    }
}

int main() {
    vector<int> arr = {38, 27, 43, 3, 9, 82, 10, 15, 55, 21};
    quicksort(arr, 0, arr.size() - 1);
    for (int x : arr) cout << x << " ";
    cout << endl;
    return 0;
}`,
    java: `import java.util.Arrays;

public class QuickSort {
    public static void quicksort(int[] arr, int lo, int hi) {
        if (lo < hi) {
            int p = partition(arr, lo, hi);
            quicksort(arr, lo, p - 1);
            quicksort(arr, p + 1, hi);
        }
    }

    private static int partition(int[] arr, int lo, int hi) {
        int pivot = arr[hi];
        int i = lo;
        for (int j = lo; j < hi; j++) {
            if (arr[j] < pivot) {
                int temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
                i++;
            }
        }
        int temp = arr[i];
        arr[i] = arr[hi];
        arr[hi] = temp;
        return i;
    }

    public static void main(String[] args) {
        int[] arr = {38, 27, 43, 3, 9, 82, 10, 15, 55, 21};
        quicksort(arr, 0, arr.length - 1);
        System.out.println(Arrays.toString(arr));
    }
}`,
  },

  "binary-search": {
    python: `def binary_search(arr: list[int], target: int) -> int:
    """Return index of target in sorted array, or -1 if not found."""
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


if __name__ == "__main__":
    arr = [3, 9, 10, 15, 21, 27, 38, 43, 55, 82]
    print(binary_search(arr, 43))  # 7`,
    cpp: `#include <vector>
#include <iostream>
using namespace std;

int binarySearch(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> arr = {3, 9, 10, 15, 21, 27, 38, 43, 55, 82};
    cout << binarySearch(arr, 43) << endl;  // 7
    return 0;
}`,
    java: `public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int lo = 0, hi = arr.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {3, 9, 10, 15, 21, 27, 38, 43, 55, 82};
        System.out.println(binarySearch(arr, 43));  // 7
    }
}`,
  },

  "bfs": {
    python: `from collections import deque


def bfs(graph: dict, start: int) -> list[int]:
    """Breadth-First Search traversal order."""
    visited = []
    queue = deque([start])
    seen = set([start])

    while queue:
        node = queue.popleft()
        visited.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in seen:
                seen.add(neighbor)
                queue.append(neighbor)
    return visited


if __name__ == "__main__":
    graph = {
        0: [1, 2], 1: [0, 3, 4], 2: [0, 5, 6],
        3: [1], 4: [1, 7], 5: [2], 6: [2], 7: [4],
    }
    print(bfs(graph, 0))  # [0, 1, 2, 3, 4, 5, 6, 7]`,
    cpp: `#include <vector>
#include <queue>
#include <unordered_set>
#include <iostream>
using namespace std;

vector<int> bfs(vector<vector<int>>& graph, int start) {
    vector<int> visited;
    queue<int> q;
    unordered_set<int> seen;

    q.push(start);
    seen.insert(start);

    while (!q.empty()) {
        int node = q.front(); q.pop();
        visited.push_back(node);
        for (int neighbor : graph[node]) {
            if (seen.find(neighbor) == seen.end()) {
                seen.insert(neighbor);
                q.push(neighbor);
            }
        }
    }
    return visited;
}

int main() {
    vector<vector<int>> graph = {
        {1, 2}, {0, 3, 4}, {0, 5, 6},
        {1}, {1, 7}, {2}, {2}, {4},
    };
    auto res = bfs(graph, 0);
    for (int x : res) cout << x << " ";
    cout << endl;  // 0 1 2 3 4 5 6 7
    return 0;
}`,
    java: `import java.util.*;

public class BFS {
    public static List<Integer> bfs(Map<Integer, List<Integer>> graph, int start) {
        List<Integer> visited = new ArrayList<>();
        Queue<Integer> queue = new LinkedList<>();
        Set<Integer> seen = new HashSet<>();

        queue.offer(start);
        seen.add(start);

        while (!queue.isEmpty()) {
            int node = queue.poll();
            visited.add(node);
            for (int neighbor : graph.getOrDefault(node, new ArrayList<>())) {
                if (!seen.contains(neighbor)) {
                    seen.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
        return visited;
    }

    public static void main(String[] args) {
        Map<Integer, List<Integer>> graph = new HashMap<>();
        graph.put(0, Arrays.asList(1, 2));
        graph.put(1, Arrays.asList(0, 3, 4));
        graph.put(2, Arrays.asList(0, 5, 6));
        graph.put(3, Arrays.asList(1));
        graph.put(4, Arrays.asList(1, 7));
        graph.put(5, Arrays.asList(2));
        graph.put(6, Arrays.asList(2));
        graph.put(7, Arrays.asList(4));
        System.out.println(bfs(graph, 0));
    }
}`,
  },

  "dp-table": {
    python: `def lcs(s1: str, s2: str) -> int:
    """Longest Common Subsequence length (DP table)."""
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


if __name__ == "__main__":
    print(lcs("ABCBDAB", "BDCABA"))  # 4`,
    cpp: `#include <vector>
#include <string>
#include <iostream>
using namespace std;

int lcs(const string& s1, const string& s2) {
    int m = s1.size(), n = s2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1[i - 1] == s2[j - 1])
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}

int main() {
    cout << lcs("ABCBDAB", "BDCABA") << endl;  // 4
    return 0;
}`,
    java: `public class LCS {
    public static int lcs(String s1, String s2) {
        int m = s1.length(), n = s2.length();
        int[][] dp = new int[m + 1][n + 1];

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1))
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                else
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][n];
    }

    public static void main(String[] args) {
        System.out.println(lcs("ABCBDAB", "BDCABA"));  // 4
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Algorithm metadata
// ---------------------------------------------------------------------------
const COMPONENTS: Record<string, React.ComponentType<any>> = {
  "two-pointers": TwoPointersViz,
  "quick-sort": QuickSortViz,
  "binary-search": BinarySearchViz,
  "bfs": BFSViz,
  "dp-table": DPTableViz,
};

const TITLES: Record<string, string> = {
  "two-pointers": "双指针 (Two Pointers)",
  "quick-sort": "快速排序 (Quick Sort)",
  "binary-search": "二分查找 (Binary Search)",
  "bfs": "广度优先搜索 (BFS)",
  "dp-table": "动态规划 (DP Table)",
};

// Algorithms that accept custom numeric array + target input
const USES_TARGET: Record<string, boolean> = {
  "two-pointers": true,
  "binary-search": true,
};

// Algorithms that accept custom numeric array input (all array-based)
const USES_ARRAY: Record<string, boolean> = {
  "two-pointers": true,
  "quick-sort": true,
  "binary-search": true,
};

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function AlgorithmPage() {
  const { algorithm } = useParams<{ algorithm: string }>();
  const VizComponent = COMPONENTS[algorithm || ""];
  const title = TITLES[algorithm || ""] || algorithm;
  const codeSnippets = CODE_SNIPPETS[algorithm || ""];
  const showArrayInput = USES_ARRAY[algorithm || ""] || false;
  const showTargetInput = USES_TARGET[algorithm || ""] || false;

  const [language, setLanguage] = useState("python");
  const [arrayInput, setArrayInput] = useState("");
  const [targetInput, setTargetInput] = useState("");

  // Parse user input into typed values
  const parsedArray = useMemo(() => {
    if (!arrayInput.trim()) return undefined;
    const nums = arrayInput
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n));
    return nums.length >= 2 ? nums : undefined;
  }, [arrayInput]);

  const parsedTarget = useMemo(() => {
    if (!targetInput.trim()) return undefined;
    const n = Number(targetInput.trim());
    return isNaN(n) ? undefined : n;
  }, [targetInput]);

  // ── Not-found fallback ──
  if (!VizComponent) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        算法 &quot;{algorithm}&quot; 尚未实现可视化
        <div className="mt-4">
          <Link href="/visualize">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回列表
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Render visualisation with correct props ──
  const renderViz = () => {
    if (algorithm === "two-pointers") {
      return <TwoPointersViz customArray={parsedArray} customTarget={parsedTarget} />;
    }
    if (algorithm === "quick-sort") {
      return <QuickSortViz customArray={parsedArray} />;
    }
    if (algorithm === "binary-search") {
      return <BinarySearchViz customArray={parsedArray} customTarget={parsedTarget} />;
    }
    // BFS and DP Table don't accept custom input (use built-in data)
    return <VizComponent />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/visualize">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left: Visualization + Controls ── */}
        <div className="lg:col-span-2">{renderViz()}</div>

        {/* ── Right sidebar: custom input + code ── */}
        <div className="space-y-4">
          {/* Custom test-case input */}
          {(showArrayInput || showTargetInput) && (
            <div className="border rounded-lg p-4 bg-card space-y-3">
              <h3 className="font-semibold text-sm">自定义测试数据</h3>
              {showArrayInput && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    数组（逗号分隔）
                  </Label>
                  <Input
                    placeholder={algorithm === "two-pointers"
                      ? "1,3,5,7,9,11,13,15"
                      : algorithm === "binary-search"
                        ? "3,9,10,15,21,27,38,43,55,82"
                        : "38,27,43,3,9,82,10,15,55,21"}
                    value={arrayInput}
                    onChange={(e) => setArrayInput(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {showTargetInput && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    目标值
                  </Label>
                  <Input
                    placeholder={algorithm === "two-pointers" ? "14" : "43"}
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {parsedArray
                  ? `使用自定义数组 [${parsedArray.join(", ")}]（${parsedArray.length} 个元素）`
                  : "留空则使用默认数据"}
                {showTargetInput && parsedTarget !== undefined
                  ? `，目标值: ${parsedTarget}`
                  : ""}
              </p>
            </div>
          )}

          {/* Code tabs */}
          {codeSnippets && (
            <div className="border rounded-lg bg-card overflow-hidden">
              <Tabs value={language} onValueChange={(v) => setLanguage(v)}>
                <TabsList className="w-full rounded-none border-b h-9">
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.value} value={l.value} className="text-xs px-3">
                      {l.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((l) => (
                  <TabsContent key={l.value} value={l.value} className="mt-0">
                    <pre className="bg-zinc-950 text-zinc-100 p-4 text-xs overflow-auto max-h-[500px] leading-relaxed whitespace-pre font-mono">
                      {codeSnippets[l.value] || "暂无"}
                    </pre>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {/* Algorithm complexity notes */}
          <div className="border rounded-lg p-4 bg-card space-y-2">
            <h3 className="font-semibold text-sm">复杂度分析</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              {algorithm === "two-pointers" && (
                <>
                  <p>时间复杂度: <span className="font-mono text-foreground">O(n)</span></p>
                  <p>空间复杂度: <span className="font-mono text-foreground">O(1)</span></p>
                  <p className="text-xs mt-2">左右指针从两端向中间移动，每次迭代排除一个元素。</p>
                </>
              )}
              {algorithm === "quick-sort" && (
                <>
                  <p>时间复杂度: <span className="font-mono text-foreground">O(n log n) 平均</span></p>
                  <p>最坏情况: <span className="font-mono text-foreground">O(n²)</span></p>
                  <p>空间复杂度: <span className="font-mono text-foreground">O(log n)</span></p>
                </>
              )}
              {algorithm === "binary-search" && (
                <>
                  <p>时间复杂度: <span className="font-mono text-foreground">O(log n)</span></p>
                  <p>空间复杂度: <span className="font-mono text-foreground">O(1)</span></p>
                  <p className="text-xs mt-2">每次迭代将搜索范围减半，需要数组已排序。</p>
                </>
              )}
              {algorithm === "bfs" && (
                <>
                  <p>时间复杂度: <span className="font-mono text-foreground">O(V + E)</span></p>
                  <p>空间复杂度: <span className="font-mono text-foreground">O(V)</span></p>
                  <p className="text-xs mt-2">V 顶点数，E 边数。使用队列保证按层遍历。</p>
                </>
              )}
              {algorithm === "dp-table" && (
                <>
                  <p>时间复杂度: <span className="font-mono text-foreground">O(m * n)</span></p>
                  <p>空间复杂度: <span className="font-mono text-foreground">O(m * n)</span></p>
                  <p className="text-xs mt-2">LCS 问题。m, n 为两个字符串的长度。</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
