// Renders tree traversal algorithms
import { AlgorithmRenderer } from "./index";

interface TreeNode {
  val: number;
  left?: TreeNode;
  right?: TreeNode;
}

export const TreeRenderer: AlgorithmRenderer = ({ ctx, width, height, frame }) => {
  ctx.clearRect(0, 0, width, height);
  const tree = frame.stateSnapshot?.tree;
  if (!tree) return;

  const highlights = frame.highlights || [];
  const nodeRadius = 22;

  const drawNode = (node: TreeNode, x: number, y: number, depth: number, maxDepth: number) => {
    const spacing = width / Math.pow(2, depth + 1);
    const isHighlighted = highlights.includes(node.val);

    // Draw edges to children
    if (node.left) {
      const childX = x - spacing;
      const childY = y + 70;
      ctx.beginPath();
      ctx.strokeStyle = "#d1d5db";
      ctx.moveTo(x, y + nodeRadius);
      ctx.lineTo(childX, childY - nodeRadius);
      ctx.stroke();
      drawNode(node.left, childX, childY, depth + 1, maxDepth);
    }
    if (node.right) {
      const childX = x + spacing;
      const childY = y + 70;
      ctx.beginPath();
      ctx.strokeStyle = "#d1d5db";
      ctx.moveTo(x, y + nodeRadius);
      ctx.lineTo(childX, childY - nodeRadius);
      ctx.stroke();
      drawNode(node.right, childX, childY, depth + 1, maxDepth);
    }

    // Node circle
    ctx.beginPath();
    ctx.fillStyle = isHighlighted ? "#f59e0b" : "#3b82f6";
    ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(node.val), x, y);
  };

  drawNode(tree, width / 2, 40, 0, 4);
};
