"use client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const DIFFICULTY_COLORS: Record<string, string> = {
  "简单": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "中等": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "困难": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "专家": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

interface Props {
  title: string;
  difficulty: string;
  difficultyScore: number;
  timeLimit: number;
  memoryLimit: number;
  tags: string[];
  acceptCount?: number;
  submitCount?: number;
}

export default function ProblemHeader({ title, difficulty, difficultyScore, timeLimit, memoryLimit, tags, acceptCount, submitCount }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Badge className={`text-lg px-3 py-1 ${DIFFICULTY_COLORS[difficulty] || ""}`}>
          {difficulty}
        </Badge>
        {tags?.map((t) => <Badge key={t} variant="secondary" className="text-base">{t}</Badge>)}
      </div>
      <div className="flex gap-4 text-base text-muted-foreground">
        <span>⏱ 时限: {timeLimit}ms</span>
        <span>📦 内存: {memoryLimit}MB</span>
        <span>🎯 难度分: {difficultyScore}</span>
        {acceptCount != null && submitCount != null && submitCount > 0 && (
          <span>
            📊 通过率: {((acceptCount / submitCount) * 100).toFixed(1)}%
          </span>
        )}
      </div>
      <Separator />
    </div>
  );
}
