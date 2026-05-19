import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ProblemsPageContent from "./problems-content";

export default function ProblemsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 min-w-[200px]" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-5 w-20" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      }
    >
      <ProblemsPageContent />
    </Suspense>
  );
}
