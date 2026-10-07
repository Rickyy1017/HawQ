import { createFileRoute } from "@tanstack/react-router";
import { DemoNotice } from "../components/DemoNotice";

export const Route = createFileRoute("/quant")({
  head: () => ({
    meta: [
      { title: "Quant — HawQ" },
      {
        name: "description",
        content:
          "Quant strategy research, backtesting, paper trading and live signals are coming soon to HawQ.",
      },
      { property: "og:title", content: "Quant — HawQ" },
      {
        property: "og:description",
        content:
          "Quant strategy research, backtesting, paper trading and live signals are coming soon to HawQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuantPage,
});
function QuantPage() {
  return (
    <main className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">Quant</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Coming Soon</p>
      </div>
      <DemoNotice />
      <div className="max-w-2xl border-t border-border pt-6">
        <h2 className="font-display text-xl font-semibold">
          Strategy research is in development
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Quant will bring strategy research, backtesting, paper trading and
          live signals together in one place. These tools are not available yet;
          there are no performance results or live signals to display.
        </p>
      </div>
    </main>
  );
}
