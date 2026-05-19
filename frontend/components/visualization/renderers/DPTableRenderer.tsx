import { AlgorithmRenderer } from "./index";

export const DPTableRenderer: AlgorithmRenderer = ({ ctx, width, height, frame }) => {
  ctx.clearRect(0, 0, width, height);
  const dp = frame.stateSnapshot?.dp || [];
  const highlights = frame.highlights || []; // [[r,c], ...]

  if (!dp.length) return;

  const rows = dp.length;
  const cols = dp[0].length;
  const cellSize = Math.min(50, Math.min((width - 20) / cols, (height - 40) / rows));
  const offsetX = (width - cellSize * cols) / 2;
  const offsetY = 30;

  dp.forEach((row: number[], r: number) => {
    row.forEach((val: number, c: number) => {
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;
      const isHighlighted = highlights.some((h) => Array.isArray(h) && h[0] === r && h[1] === c);

      ctx.fillStyle = isHighlighted ? "#fbbf24" : "#f3f4f6";
      ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

      ctx.fillStyle = "#374151";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(val), x + cellSize / 2, y + cellSize / 2);
    });
  });
};
