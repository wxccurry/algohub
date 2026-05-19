"use client";
import { useCallback, useEffect, useMemo } from "react";
import AlgoCanvas from "@/components/visualization/AlgoCanvas";
import PlaybackControls from "@/components/visualization/controls/PlaybackControls";
import { useAnimation } from "@/hooks/useAnimation";

// LCS - Longest Common Subsequence DP table
const S1 = "ABCBDAB";
const S2 = "BDCABA";

interface FrameData {
  dp: number[][];
  i: number;
  j: number;
  match: boolean;
}

export default function DPTableViz() {
  const frames = useMemo(() => {
    const result: FrameData[] = [];
    const m = S1.length;
    const n = S2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    result.push({ dp: dp.map((r) => [...r]), i: 0, j: 0, match: false });

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const match = S1[i - 1] === S2[j - 1];
        if (match) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
        result.push({ dp: dp.map((r) => [...r]), i, j, match });
      }
    }

    return result;
  }, []);

  interface D { dp: number[][]; i: number; j: number; match: boolean }
  const anim = useAnimation<D>(
    { dp: Array.from({ length: S1.length + 1 }, () => Array(S2.length + 1).fill(0)), i: 0, j: 0, match: false },
    frames.length - 1
  );

  useEffect(() => {
    anim.registerSteps(frames.map((d, idx) => ({ step: idx, data: d })));
  }, [frames, anim.registerSteps]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const d = anim.state.data;
      const rows = d.dp.length;
      const cols = d.dp[0]?.length || 0;
      if (!cols) return;

      const cellSize = Math.min(40, Math.min((w - 60) / (cols + 1), (h - 80) / (rows + 1)));
      const offsetX = 50;
      const offsetY = 50;

      ctx.clearRect(0, 0, w, h);
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Draw column headers (s2 chars)
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("s₁ \\ s₂", offsetX - 28, offsetY - cellSize);
      ctx.font = "13px monospace";
      for (let j = 0; j < cols; j++) {
        if (j === 0) {
          ctx.fillText("", offsetX + j * cellSize + cellSize / 2, offsetY - cellSize / 2);
        } else {
          ctx.fillStyle = "#374151";
          ctx.fillText(S2[j - 1], offsetX + j * cellSize + cellSize / 2, offsetY - cellSize / 2);
        }
      }

      // Draw row headers (s1 chars)
      for (let i = 0; i < rows; i++) {
        if (i === 0) {
          ctx.fillText("", offsetX - cellSize / 2, offsetY + i * cellSize + cellSize / 2);
        } else {
          ctx.fillStyle = "#374151";
          ctx.fillText(S1[i - 1], offsetX - cellSize / 2, offsetY + i * cellSize + cellSize / 2);
        }
      }

      // Draw DP table cells
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const x = offsetX + j * cellSize;
          const y = offsetY + i * cellSize;

          let bgColor = "#f3f4f6";
          if (i === d.i && j === d.j) {
            bgColor = d.match ? "#22c55e" : "#fbbf24";
          } else if (i > 0 && j > 0 && i <= d.i && j <= d.j) {
            bgColor = "#e5e7eb";
          }

          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

          ctx.fillStyle = i === 0 || j === 0 ? "#9ca3af" : "#374151";
          ctx.font = i === 0 || j === 0 ? "12px monospace" : "bold 13px monospace";
          ctx.fillText(String(d.dp[i][j]), x + cellSize / 2, y + cellSize / 2);
        }
      }

      // Info text
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "center";
      const charI = d.i > 0 ? S1[d.i - 1] : "?";
      const charJ = d.j > 0 ? S2[d.j - 1] : "?";
      ctx.fillText(
        `LCS DP 表格  |  s₁[${d.i - 1}]="${charI}"  s₂[${d.j - 1}]="${charJ}"  ${d.match ? "✓ 匹配" : "取 max"}  |  结果: LCS 长度 = ${d.dp[rows - 1]?.[cols - 1] || 0}`,
        w / 2, 20
      );
    },
    [anim.state.data]
  );

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-card">
        <AlgoCanvas draw={draw} width={700} height={450} />
      </div>
      <PlaybackControls
        playing={anim.state.playing}
        step={anim.state.step}
        totalSteps={anim.state.totalSteps}
        speed={anim.state.speed}
        onPlay={anim.play}
        onPause={anim.pause}
        onNext={anim.next}
        onPrev={anim.prev}
        onReset={anim.reset}
        onSpeedChange={anim.setSpeed}
      />
    </div>
  );
}
