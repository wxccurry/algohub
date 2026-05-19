"use client";
import { cn } from "@/lib/utils";

interface Props {
  value?: number;
  className?: string;
}

function Progress({ value = 0, className }: Props) {
  return (
    <div className={cn("bg-primary/20 h-2 w-full overflow-hidden rounded-full", className)}>
      <div
        className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export { Progress };
