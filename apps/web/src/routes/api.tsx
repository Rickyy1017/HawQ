import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from '../components/GlassCard';
import { cn } from '../lib/utils';
import { Code2, Terminal, Zap } from "lucide-react";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "API & MCP — DeFi Hawk" },
      { name: "description", content: "Programmatic access to DeFi Hawk analytics via REST endpoints and MCP." },
    ],
  }),
  component: ApiPage,
});

const ENDPOINTS = [
  { method: "GET", path: "/api/protocols", desc: "List all indexed protocols with TVL" },
  { method: "GET", path: "/api/protocols/:slug", desc: "Detailed TVL history for a protocol" },
  { method: "GET", path: "/api/chains", desc: "TVL distribution across chains" },
  { method: "GET", path: "/api/prices", desc: "Live token prices (BTC, ETH, USDT)" },
  { method: "GET", path: "/api/stablecoins", desc: "Stablecoin dominance and demand signals" },
  { method: "GET", path: "/api/activity", desc: "Recent protocol and wallet events" },
];

const methodColor: Record<string, string> = {
  GET: "bg-success/15 text-success",
  POST: "bg-primary/15 text-primary",
};

function ApiPage() {
  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">API &amp; MCP</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Programmatic access to DeFi Hawk's multi-chain analytics.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Zap, title: "Real-time", desc: "5-minute TVL refresh cadence" },
          { icon: Code2, title: "REST + JSON", desc: "Simple, predictable responses" },
          { icon: Terminal, title: "MCP Server", desc: "Use directly from AI agents" },
        ].map((c, i) => (
          <GlassCard key={c.title} delay={i * 0.05} className="p-5">
            <div className="mb-2 inline-flex rounded-xl bg-primary/15 p-2.5 text-primary ring-1 ring-primary/20">
              <c.icon className="h-5 w-5" />
            </div>
            <p className="font-display font-semibold">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Endpoints</h2>
        <div className="space-y-2">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex items-center gap-3 rounded-xl bg-secondary/30 px-4 py-3">
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", methodColor[e.method])}>
                {e.method}
              </span>
              <code className="font-mono text-sm">{e.path}</code>
              <span className="ml-auto hidden text-xs text-muted-foreground sm:block">{e.desc}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Quick start</h2>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background/60 p-4 text-xs leading-relaxed text-muted-foreground">
{`curl https://defihawk.app/api/protocols \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Response
[
  {
    "name": "Lido",
    "slug": "lido",
    "tvl": 32104000000,
    "chain": "Ethereum",
    "change1d": 1.24
  }
]`}
        </pre>
      </GlassCard>
    </div>
  );
}
