import { cn } from "../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-glass rounded-xl", className)} />;
}

export function MetricSkeleton() {
  return (
    <div className="glass rounded-2xl p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-4 h-4 w-16" />
    </div>
  );
}
