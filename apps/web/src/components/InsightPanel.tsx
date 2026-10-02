import { GlassCard } from "./GlassCard";
import { cn } from '../lib/utils';
import { Sparkles, TrendingUp, AlertTriangle, Info } from "lucide-react";
import type { MarketInsight } from '../types';

const toneMap = {
  positive: { ring: "ring-success/40", glow: "shadow-success/20", icon: TrendingUp, color: "text-success" },
  warning: { ring: "ring-warning/40", glow: "shadow-warning/20", icon: AlertTriangle, color: "text-warning" },
  neutral: { ring: "ring-primary/30", glow: "shadow-primary/20", icon: Info, color: "text-primary" },
} as const;

export function InsightPanel({ insights }: { insights: MarketInsight[] }) {
  return (
    <GlassCard strong className="p-6">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Market Intelligence Summary</h2>
        <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Rule-based engine
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((ins) => {
          const t = toneMap[ins.tone];
          const Icon = t.icon;
          return (
            <div
              key={ins.id}
              className={cn(
                "rounded-xl bg-secondary/30 p-4 ring-1 shadow-lg transition-transform hover:scale-[1.01]",
                t.ring,
                t.glow,
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.color)} />
                <div>
                  <p className="text-sm font-semibold leading-snug">{ins.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{ins.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
        {insights.length === 0 && (
          <p className="text-sm text-muted-foreground">No notable signals right now.</p>
        )}
      </div>
    </GlassCard>
  );
}
