import { AlgorithmRenderer } from "./index";
import { ArrayRenderer } from "./ArrayRenderer";
import { TreeRenderer } from "./TreeRenderer";
import { DPTableRenderer } from "./DPTableRenderer";
import { GraphRenderer } from "./GraphRenderer";

// Map algorithm types to renderers
export const RENDERER_MAP: Record<string, AlgorithmRenderer> = {
  two_pointers: ArrayRenderer,
  sliding_window: ArrayRenderer,
  binary_search: ArrayRenderer,
  sorting: ArrayRenderer,
  tree_traversal: TreeRenderer,
  dp_table: DPTableRenderer,
  graph: GraphRenderer,
  bfs: GraphRenderer,
  dfs: GraphRenderer,
  backtracking: ArrayRenderer,
  linked_list: ArrayRenderer,
  monotonic_stack: ArrayRenderer,
};

export function getRenderer(algorithmType: string): AlgorithmRenderer | undefined {
  return RENDERER_MAP[algorithmType];
}
