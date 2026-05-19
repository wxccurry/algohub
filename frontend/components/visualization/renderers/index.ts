export interface Frame {
  step: number;
  variables?: Record<string, any>;
  highlights?: (number | number[])[];
  pointers?: Record<string, number>;
  log?: string;
  stateSnapshot?: any;
}

export interface RendererProps {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frame: Frame;
  algorithmType: string;
}

export type AlgorithmRenderer = (props: RendererProps) => void;
