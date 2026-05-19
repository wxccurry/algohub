"use client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

interface Props {
  playing: boolean;
  step: number;
  totalSteps: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function PlaybackControls({
  playing, step, totalSteps, speed, onPlay, onPause, onNext, onPrev, onReset, onSpeedChange,
}: Props) {
  const speeds = [
    { value: 1000, label: "1x" },
    { value: 500, label: "2x" },
    { value: 250, label: "4x" },
    { value: 100, label: "10x" },
  ];

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-card">
      <Button variant="outline" size="icon" onClick={onReset} title="重置">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onPrev} disabled={step <= 0} title="上一步">
        <SkipBack className="h-4 w-4" />
      </Button>
      {playing ? (
        <Button variant="default" size="icon" onClick={onPause} title="暂停">
          <Pause className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="default" size="icon" onClick={onPlay} disabled={step >= totalSteps} title="播放">
          <Play className="h-4 w-4" />
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={onNext} disabled={step >= totalSteps} title="下一步">
        <SkipForward className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground ml-2">
        {step + 1} / {totalSteps + 1}
      </span>
      <div className="flex-1" />
      <Select value={String(speed)} onValueChange={(v) => v && onSpeedChange(Number(v))}>
        <SelectTrigger className="w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {speeds.map((s) => (
            <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
