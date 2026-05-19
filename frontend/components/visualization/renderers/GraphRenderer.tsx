import { AlgorithmRenderer } from "./index";

export const GraphRenderer: AlgorithmRenderer = ({ ctx, width, height, frame }) => {
  ctx.clearRect(0, 0, width, height);
  const nodes = frame.stateSnapshot?.nodes || []; // [{id, x, y}]
  const edges = frame.stateSnapshot?.edges || []; // [{from, to}]
  const visited = frame.highlights || [];

  const posMap: Record<number, { x: number; y: number }> = {};
  const radius = 20;
  const n = nodes.length;

  // Layout nodes in a circle
  nodes.forEach((node: any, i: number) => {
    const angle = (2 * Math.PI * i) / n;
    const cx = width / 2 + Math.cos(angle) * Math.min(width, height) * 0.35;
    const cy = height / 2 + Math.sin(angle) * Math.min(width, height) * 0.35;
    posMap[node.id] = { x: cx, y: cy };
  });

  // Draw edges
  edges.forEach((edge: any) => {
    const from = posMap[edge.from];
    const to = posMap[edge.to];
    if (from && to) {
      ctx.beginPath();
      ctx.strokeStyle = "#d1d5db";
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  });

  // Draw nodes
  nodes.forEach((node: any) => {
    const pos = posMap[node.id];
    if (!pos) return;
    ctx.beginPath();
    ctx.fillStyle = visited.includes(node.id) ? "#f59e0b" : "#3b82f6";
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(node.id), pos.x, pos.y);
  });
};
