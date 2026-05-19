"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import AlgoCanvas from "@/components/visualization/AlgoCanvas";
import PlaybackControls from "@/components/visualization/controls/PlaybackControls";
import { useAnimation } from "@/hooks/useAnimation";

interface FrameData {
  array: number[];
  leftIdx: number;
  rightIdx: number;
  found: boolean;
  target: number;
}

interface TwoPointersProps {
  customArray?: number[];
  customTarget?: number;
}

export default function TwoPointersViz({ customArray, customTarget }: TwoPointersProps) {
  const target = customTarget ?? 14;
  const defaultArr = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const initialArray = useMemo(() => {
    if (customArray && customArray.length >= 2) return customArray;
    return defaultArr;
  }, [customArray]);

  const frames = useMemo(() => {
    const frames: FrameData[] = [];
    const arr = [...initialArray];
    let left = 0;
    let right = arr.length - 1;

    frames.push({ array: [...arr], leftIdx: left, rightIdx: right, found: false, target });

    while (left <= right) {
      const sum = arr[left] + arr[right];
      if (sum === target) {
        frames.push({ array: [...arr], leftIdx: left, rightIdx: right, found: true, target });
        break;
      } else if (sum < target) {
        left++;
      } else {
        right--;
      }
      frames.push({ array: [...arr], leftIdx: left, rightIdx: right, found: false, target });
    }
    return frames;
  }, [initialArray, target]);

  interface D { array: number[]; leftIdx: number; rightIdx: number; found: boolean; target: number; }
  const anim = useAnimation<D>(
    { array: [...initialArray], leftIdx: 0, rightIdx: initialArray.length - 1, found: false, target },
    frames.length - 1
  );

  const isFirstRender = useRef(true);

  useEffect(() => {
    anim.registerSteps(frames.map((d, i) => ({ step: i, data: d })));
  }, [frames, anim.registerSteps]);

  // Reset animation when custom input changes
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
      const barW = Math.min(50, (w - 100) / n);
      const startX = (w - barW * n) / 2;
      const baseY = h - 60;

      ctx.clearRect(0, 0, w, h);
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";

      d.array.forEach((val, i) => {
        const x = startX + i * barW;
        const barH = val * 12;

        // Highlight logic
        if (d.found && (i === d.leftIdx || i === d.rightIdx)) {
          ctx.fillStyle = "#22c55e";
        } else if (i === d.leftIdx) {
          ctx.fillStyle = "#3b82f6";
        } else if (i === d.rightIdx) {
          ctx.fillStyle = "#ef4444";
        } else {
          ctx.fillStyle = "#71717a";
        }

        ctx.fillRect(x + 2, baseY - barH, barW - 4, barH);
        ctx.fillStyle = "#a1a1aa";
        ctx.fillText(String(val), x + barW / 2, baseY + 16);
      });

      // Labels
      const lx = startX + d.leftIdx * barW + barW / 2;
      const rx = startX + d.rightIdx * barW + barW / 2;
      ctx.fillStyle = "#3b82f6";
      ctx.fillText("L", lx, baseY + 36);
      ctx.fillStyle = "#ef4444";
      ctx.fillText("R", rx, baseY + 36);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "16px sans-serif";
      const sum = d.array[d.leftIdx] + d.array[d.rightIdx];
      ctx.fillText(
        `arr[L] + arr[R] = ${d.array[d.leftIdx]} + ${d.array[d.rightIdx]} = ${sum}  target: ${d.target}  ${d.found ? "✓ 找到!" : sum < d.target ? "→ 左指针右移" : "→ 右指针左移"}`,
        w / 2, 30
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
