import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from '../components/GlassCard';
import { cn } from '../lib/utils';
import { TrendingUp, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research — DeFi-Wolf" },
      { name: "description", content: "In-depth DeFi research, reports and market analysis from DeFi-Wolf." },
    ],
  }),
  component: ResearchPage,
});

const ARTICLES = [
  {
    tag: "Market",
    title: "The State of Liquid Staking in 2026",
    excerpt: "How LSDs became the largest category in DeFi and what restaking means for the next cycle.",
    read: "8 min",
    featured: true,
  },
  {
    tag: "Chains",
    title: "Layer 2 TVL Migration Patterns",
    excerpt: "Tracking capital flows from Ethereum mainnet into Base, Arbitrum and Optimism.",
    read: "6 min",
  },
  {
    tag: "Stablecoins",
    title: "Yield-bearing Stablecoins Explained",
    excerpt: "A breakdown of the mechanics and risks behind the new wave of stablecoin designs.",
    read: "5 min",
  },
  {
    tag: "RWA",
    title: "Tokenized Treasuries Cross $5B",
    excerpt: "Real-world assets are scaling fast — here's where the demand is concentrated.",
    read: "7 min",
  },
  {
    tag: "Risk",
    title: "Measuring Protocol Risk with On-chain Data",
    excerpt: "A framework for scoring DeFi protocols beyond raw TVL numbers.",
    read: "9 min",
  },
];

function ResearchPage() {
  const [featured, ...rest] = ARTICLES;

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">Research</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Data-driven reports and analysis on the DeFi landscape.
        </p>
      </header>

      <GlassCard className="group relative overflow-hidden p-8">
        <div className="glow-line absolute left-0 top-0 h-px w-full opacity-60" />
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
          Featured · {featured.tag}
        </span>
        <h2 className="mt-3 font-display text-2xl font-bold">{featured.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{featured.excerpt}</p>
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
          Read report <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          <span className="ml-2 text-xs text-muted-foreground">{featured.read} read</span>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        {rest.map((a, i) => (
          <GlassCard key={a.title} delay={i * 0.05} className="group flex h-full flex-col p-5">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground")}>
                {a.tag}
              </span>
            </div>
            <p className="font-display text-lg font-semibold">{a.title}</p>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{a.excerpt}</p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
              Read <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span className="ml-2 text-xs text-muted-foreground">{a.read} read</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
