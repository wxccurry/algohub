"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import AlgoCanvas from "@/components/visualization/AlgoCanvas";
import PlaybackControls from "@/components/visualization/controls/PlaybackControls";
import { useAnimation } from "@/hooks/useAnimation";

// Graph adjacency list: node -> neighbors
const defaultGraph: Record<number, number[]> = {
  0: [1, 2],
  1: [0, 3, 4],
  2: [0, 5, 6],
  3: [1],
  4: [1, 7],
  5: [2],
  6: [2],
  7: [4],
};

interface FrameData {
  visited: number[];
  current: number;
  queue: number[];
}

export default function BFSViz() {
  const frames = useMemo(() => {
    const result: FrameData[] = [];
    const visited = new Set<number>();
    const queue: number[] = [0]; // start from node 0

    result.push({ visited: [], current: -1, queue: [...queue] });

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      result.push({ visited: [...visited], current, queue: [...queue] });

      for (const neighbor of (defaultGraph[current] || [])) {
        if (!visited.has(neighbor) && !queue.includes(neighbor)) {
          queue.push(neighbor);
        }
      }
      result.push({ visited: [...visited], current, queue: [...queue] });
    }

    result.push({ visited: [...visited], current: -1, queue: [] });
    return result;
  }, []);

  interface D { visited: number[]; current: number; queue: number[] }
  const anim = useAnimation<D>(
    { visited: [], current: -1, queue: [0] },
    frames.length - 1
  );

  useEffect(() => {
    anim.registerSteps(frames.map((d, i) => ({ step: i, data: d })));
  }, [frames, anim.registerSteps]);

  // Pre-computed node positions (circular layout for 8 nodes)
  const nodePositions = useMemo(() => {
    const positions: Record<number, { x: number; y: number }> = {};
    const nodes = Object.keys(defaultGraph).map(Number);
    const cx = 350;
    const cy = 160;
    const radius = 120;
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions[node] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
    return positions;
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const d = anim.state.data;
      ctx.clearRect(0, 0, w, h);

      // Draw edges
      Object.entries(defaultGraph).forEach(([from, neighbors]) => {
        const fromPos = nodePositions[Number(from)];
        if (!fromPos) return;
        neighbors.forEach((to) => {
          const toPos = nodePositions[to];
          if (!toPos) return;
          ctx.beginPath();
          ctx.strokeStyle = "#d1d5db";
          ctx.lineWidth = 2;
          ctx.moveTo(fromPos.x, fromPos.y);
          ctx.lineTo(toPos.x, toPos.y);
          ctx.stroke();
        });
      });

      // Draw nodes
      Object.entries(nodePositions).forEach(([nodeId, pos]) => {
        const id = Number(nodeId);
        const isVisited = d.visited.includes(id);
        const isCurrent = d.current === id;
        const isQueued = d.queue.includes(id);

        ctx.beginPath();
        if (isCurrent) {
          ctx.fillStyle = "#f59e0b"; // amber - currently processing
        } else if (isVisited) {
          ctx.fillStyle = "#22c55e"; // green - visited
        } else if (isQueued) {
          ctx.fillStyle = "#3b82f6"; // blue - in queue
        } else {
          ctx.fillStyle = "#d4d4d8"; // gray - unvisited
        }
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(nodeId, pos.x, pos.y);
      });

      // Status text
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `队列: [${d.queue.join(", ")}]   已访问: [${d.visited.join(", ")}]` +
        (d.current >= 0 ? `   当前: ${d.current}` : ""),
        w / 2, 24
      );
    },
    [anim.state.data, nodePositions]
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
