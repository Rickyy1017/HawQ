import { createFileRoute } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { GlassCard } from '../components/GlassCard';
import { Skeleton } from '../components/Skeleton';
import { ActivityFeed } from '../components/ActivityFeed';
import { useActivityFeed } from '../hooks/useDefiData';

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Feed — DeFi-Wolf" },
      {
        name: "description",
        content:
          "Live feed of protocol and wallet events across chains — deposits, withdrawals, swaps and whale moves with timestamps and filters.",
      },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { events, isLoading } = useActivityFeed(80);

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <span className="text-gradient">Activity Feed</span>
          <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-success/30">
            <Radio className="h-3 w-3 animate-pulse" /> Live
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent protocol and wallet events with timestamps. Filter by chain and event type.
        </p>
      </div>

      <GlassCard className="p-5">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <ActivityFeed events={events} />
        )}
      </GlassCard>
    </div>
  );
}
