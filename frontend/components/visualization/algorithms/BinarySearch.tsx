"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import AlgoCanvas from "@/components/visualization/AlgoCanvas";
import PlaybackControls from "@/components/visualization/controls/PlaybackControls";
import { useAnimation } from "@/hooks/useAnimation";

interface FrameData {
  array: number[];
  lo: number;
  hi: number;
  mid: number;
  found: boolean;
  target: number;
}

interface BinarySearchProps {
  customArray?: number[];
  customTarget?: number;
}

export default function BinarySearchViz({ customArray, customTarget }: BinarySearchProps) {
  const target = customTarget ?? 43;
  const defaultArr = [3, 9, 10, 15, 21, 27, 38, 43, 55, 82];
  const initialArray = useMemo(() => {
    if (customArray && customArray.length >= 2) {
      // Sort the input for binary search
      return [...customArray].sort((a, b) => a - b);
    }
    return defaultArr;
  }, [customArray]);

  const frames = useMemo(() => {
    const frames: FrameData[] = [];
    const arr = [...initialArray];
    let lo = 0;
    let hi = arr.length - 1;
    let found = false;
    let foundIdx = -1;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      frames.push({ array: [...arr], lo, hi, mid, found: false, target });
      if (arr[mid] === target) {
        found = true;
        foundIdx = mid;
        frames.push({ array: [...arr], lo, hi, mid, found: true, target });
        break;
      } else if (arr[mid] < target) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (!found) {
      frames.push({ array: [...arr], lo: 0, hi: -1, mid: -1, found: false, target });
    }
    return frames;
  }, [initialArray, target]);

  interface D { array: number[]; lo: number; hi: number; mid: number; found: boolean; target: number }
  const anim = useAnimation<D>(
    { array: [...initialArray], lo: 0, hi: initialArray.length - 1, mid: -1, found: false, target },
    frames.length - 1
  );

  const isFirstRender = useRef(true);

  useEffect(() => {
    anim.registerSteps(frames.map((d, i) => ({ step: i, data: d })));
  }, [frames, anim.registerSteps]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    anim.pause();
    anim.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customArray, customTarget]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const d = anim.state.data;
      const n = d.array.length;
      const barW = Math.min(50, (w - 80) / n);
      const startX = (w - barW * n) / 2;
      const baseY = h - 60;

      ctx.clearRect(0, 0, w, h);
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";

      // Draw active range highlight
      if (d.lo <= d.hi) {
        const rx = startX + d.lo * barW;
        const rw = (d.hi - d.lo + 1) * barW;
        ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
        ctx.fillRect(rx, 10, rw, baseY - 10);
      }

      d.array.forEach((val, i) => {
        const x = startX + i * barW;
        const barH = val * 5;

        if (d.found && i === d.mid) {
          ctx.fillStyle = "#22c55e";
        } else if (i === d.mid) {
          ctx.fillStyle = "#f59e0b";
        } else if (i === d.lo) {
          ctx.fillStyle = "#3b82f6";
        } else if (i === d.hi) {
          ctx.fillStyle = "#ef4444";
        } else if (i >= d.lo && i <= d.hi) {
          ctx.fillStyle = "#a1a1aa";
        } else {
          ctx.fillStyle = "#d4d4d8";
        }

        ctx.fillRect(x + 2, baseY - barH, barW - 4, barH);
        ctx.fillStyle = "#71717a";
        ctx.fillText(String(val), x + barW / 2, baseY + 16);
      });

      // Labels
      if (d.mid >= 0) {
        const mx = startX + d.mid * barW + barW / 2;
        ctx.fillStyle = "#f59e0b";
        ctx.fillText("mid", mx, baseY + 36);
      }
      if (d.lo >= 0) {
        const lx = startX + d.lo * barW + barW / 2;
        ctx.fillStyle = "#3b82f6";
        ctx.fillText("lo", lx, baseY + 50);
      }
      if (d.hi >= 0) {
        const hx = startX + d.hi * barW + barW / 2;
        ctx.fillStyle = "#ef4444";
        ctx.fillText("hi", hx, baseY + 50);
      }

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "15px sans-serif";
      const midVal = d.mid >= 0 ? d.array[d.mid] : "?";
      ctx.fillText(
        `mid=arr[${d.mid}]=${midVal}  target=${d.target}  lo=${d.lo}  hi=${d.hi}  ${d.found ? "✓ 找到!" : d.lo > d.hi ? "✗ 未找到" : ""}`,
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
