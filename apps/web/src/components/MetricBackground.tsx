import { GlassCard } from "./GlassCard";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from '../lib/utils';
import { formatPct } from '../lib/format';
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  format,
  change,
  icon: Icon,
  hint,
  delay = 0,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  change?: number;
  icon: LucideIcon;
  hint?: string;
  delay?: number;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <GlassCard delay={delay} className="relative overflow-hidden p-5">
      <div className="glow-line absolute left-0 top-0 h-px w-full opacity-60" />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-semibold md:text-3xl">
            <AnimatedNumber value={value} format={format} />
          </p>
        </div>
        <div className="rounded-xl bg-primary/15 p-2.5 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        {change != null && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-semibold",
              positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {formatPct(change)}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </GlassCard>
  );
}
