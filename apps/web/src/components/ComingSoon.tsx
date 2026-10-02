import { GlassCard } from "./GlassCard";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="py-6">
      <h1 className="mb-1 text-3xl font-bold">
        <span className="text-gradient">{title}</span>
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>
      <GlassCard className="flex flex-col items-center justify-center gap-4 p-16 text-center">
        <div className="rounded-2xl bg-primary/15 p-5 text-primary ring-1 ring-primary/20">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold">Module in development</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            This section is part of the DeFi Hawk roadmap. The Home dashboard is the live,
            data-driven analytics surface for this MVP.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

