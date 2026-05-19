"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import AlgoCanvas from "@/components/visualization/AlgoCanvas";
import PlaybackControls from "@/components/visualization/controls/PlaybackControls";
import { useAnimation } from "@/hooks/useAnimation";

interface FrameData {
  array: number[];
  pivotIdx: number;
  leftIdx: number;
  rightIdx: number;
  activeRange: { lo: number; hi: number };
}

export default function QuickSortViz() {
  const initialArray = [38, 27, 43, 3, 9, 82, 10, 15, 55, 21];

  const frames = useMemo(() => {
    const result: FrameData[] = [];
    const arr = [...initialArray];

    result.push({ array: [...arr], pivotIdx: -1, leftIdx: -1, rightIdx: -1, activeRange: { lo: 0, hi: arr.length - 1 } });

    function partition(lo: number, hi: number) {
      const pivot = arr[hi];
      let i = lo;
      result.push({ array: [...arr], pivotIdx: hi, leftIdx: i, rightIdx: hi - 1, activeRange: { lo, hi } });
      for (let j = lo; j < hi; j++) {
        if (arr[j] < pivot) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          i++;
          result.push({ array: [...arr], pivotIdx: hi, leftIdx: i, rightIdx: j, activeRange: { lo, hi } });
        }
      }
      [arr[i], arr[hi]] = [arr[hi], arr[i]];
      result.push({ array: [...arr], pivotIdx: i, leftIdx: -1, rightIdx: -1, activeRange: { lo, hi } });
      return i;
    }

    function quicksort(lo: number, hi: number) {
      if (lo < hi) {
        const p = partition(lo, hi);
        quicksort(lo, p - 1);
        quicksort(p + 1, hi);
      }
    }

    quicksort(0, arr.length - 1);
    result.push({ array: [...arr], pivotIdx: -1, leftIdx: -1, rightIdx: -1, activeRange: { lo: 0, hi: arr.length - 1 } });
    return result;
  }, []);

  interface D { array: number[]; pivotIdx: number; leftIdx: number; rightIdx: number; activeRange: { lo: number; hi: number } }
  const anim = useAnimation<D>(
    { array: [...initialArray], pivotIdx: -1, leftIdx: -1, rightIdx: -1, activeRange: { lo: 0, hi: initialArray.length - 1 } },
    frames.length - 1
  );

  useEffect(() => {
    anim.registerSteps(frames.map((d, i) => ({ step: i, data: d })));
  }, [frames, anim.registerSteps]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const d = anim.state.data;
      const n = d.array.length;
      const barW = Math.min(50, (w - 80) / n);
      const startX = (w - barW * n) / 2;
      const baseY = h - 50;

      ctx.clearRect(0, 0, w, h);
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";

      // Draw active range highlight
      if (d.activeRange.lo <= d.activeRange.hi) {
        const rx = startX + d.activeRange.lo * barW;
        const rw = (d.activeRange.hi - d.activeRange.lo + 1) * barW;
        ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
        ctx.fillRect(rx, 10, rw, baseY - 10);
      }

      d.array.forEach((val, i) => {
        const x = startX + i * barW;
        const barH = val * 3;

        if (i === d.pivotIdx) {
          ctx.fillStyle = "#f59e0b";
        } else if (i === d.leftIdx) {
          ctx.fillStyle = "#3b82f6";
        } else if (i === d.rightIdx) {
          ctx.fillStyle = "#ef4444";
        } else if (i >= d.activeRange.lo && i <= d.activeRange.hi) {
          ctx.fillStyle = "#a1a1aa";
        } else {
          ctx.fillStyle = "#d4d4d8";
        }

        ctx.fillRect(x + 2, baseY - barH, barW - 4, barH);
        ctx.fillStyle = "#71717a";
        ctx.fillText(String(val), x + barW / 2, baseY + 16);
      });

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "15px sans-serif";
      const pivotVal = d.pivotIdx >= 0 ? d.array[d.pivotIdx] : "?";
      ctx.fillText(
        `Pivot: ${pivotVal}  |  范围: [${d.activeRange.lo}, ${d.activeRange.hi}]`,
        w / 2, 24
      );
    },
    [anim.state.data]
  );

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-card">
        <AlgoCanvas draw={draw} width={700} height={350} />
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
