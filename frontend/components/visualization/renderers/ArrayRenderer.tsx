// Renders array-based algorithms: two pointers, sliding window, binary search, sorting
import { AlgorithmRenderer } from "./index";

export const ArrayRenderer: AlgorithmRenderer = ({ ctx, width, height, frame }) => {
  const array = frame.stateSnapshot?.array || frame.variables?.array || [];
  const highlights = frame.highlights || [];
  const pointers = frame.pointers || {};
  const n = array.length;

  ctx.clearRect(0, 0, width, height);

  const barWidth = Math.min(60, (width - 40) / n - 4);
  const maxVal = Math.max(...(array.length ? array : [1]), 1);
  const startX = (width - (barWidth + 4) * n) / 2;

  array.forEach((val: number, i: number) => {
    const barHeight = (val / maxVal) * (height * 0.6);
    const x = startX + i * (barWidth + 4);
    const y = height * 0.8 - barHeight;

    // Color based on highlights/pointers
    if (highlights.includes(i)) {
      ctx.fillStyle = "#f59e0b"; // amber
    } else if (Object.values(pointers).includes(i)) {
      ctx.fillStyle = "#3b82f6"; // blue
    } else {
      ctx.fillStyle = "#6b7280"; // gray
    }

    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#374151";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(val), x + barWidth / 2, y - 6);

    // Draw pointer labels
    Object.entries(pointers).forEach(([name, pos]) => {
      if (pos === i) {
        ctx.fillStyle = "#3b82f6";
        ctx.font = "bold 12px monospace";
        ctx.fillText(name, x + barWidth / 2, height * 0.85 + 15);
      }
    });
  });

  // Log
  if (frame.log) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(frame.log, 10, height - 10);
  }
};
