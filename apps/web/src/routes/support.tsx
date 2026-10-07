import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "../components/GlassCard";
import { cn } from "../lib/utils";
import { LifeBuoy, ChevronDown, BookOpen, MessageSquare } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — HawQ" },
      {
        name: "description",
        content: "Help center, FAQs and contact options for HawQ analytics.",
      },
      { property: "og:title", content: "Support — HawQ" },
      {
        property: "og:description",
        content: "Help center, FAQs and contact options for HawQ analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

const FAQS = [
  {
    q: "Where does HawQ data come from?",
    a: "TVL and protocol data is sourced from DeFiLlama. BTC, ETH and USDT prices use Chainlink Ethereum price feeds when available, then CoinGecko, with demo prices as a last fallback.",
  },
  {
    q: "How often is the data refreshed?",
    a: "Protocol TVL is cached and refreshed every 5 minutes, prices every 60 seconds. The Activity Feed and Watchlist update on a live tick for a real-time feel.",
  },
  {
    q: "Are the yields and swap routes real?",
    a: "TVL, protocols, chains and prices are real. Pool APYs and DEX swap routes are deterministic simulations layered on top of real protocol data for demonstration.",
  },
  {
    q: "Can I export the data?",
    a: "Yes. Head to the Tools page to export the full normalized protocol dataset as CSV or JSON.",
  },
  {
    q: "Which chains are supported?",
    a: "HawQ tracks major networks including Ethereum, Solana, BSC, Arbitrum, Base, Polygon, Robinhood Chain and Zcash.",
  },
];

function SupportPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">Support</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Answers to common questions and ways to reach the team.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            icon: BookOpen,
            title: "Documentation",
            desc: "Guides and API references",
          },
          {
            icon: MessageSquare,
            title: "Community",
            desc: "Join the Discord discussion",
          },
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
        <div className="mb-4 flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <div
              key={f.q}
              className="overflow-hidden rounded-xl border border-border bg-secondary/20"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
              >
                {f.q}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    open === i && "rotate-180",
                  )}
                />
              </button>
              {open === i && (
                <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
