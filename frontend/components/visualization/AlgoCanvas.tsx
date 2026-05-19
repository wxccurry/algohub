"use client";
import { useEffect, useRef } from "react";

interface Props {
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  width?: number;
  height?: number;
  className?: string;
}

export default function AlgoCanvas({ draw, width = 700, height = 400, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    draw(ctx, width, height);
  }, [draw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={width}
      height={height}
    />
  );
}
