import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Wrench,
  Link2,
  Sprout,
  Coins,
  Building2,
  LifeBuoy,
  Code2,
  Repeat,
  TrendingUp,
  ChevronLeft,
  GitCompareArrows,
  Wallet,
  Radio,
  ShieldCheck,
} from "lucide-react";

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard; badge?: string };

const NAV: NavItem[] = [
  { label: "Home", to: "/", icon: LayoutDashboard },
  { label: "Activity Feed", to: "/activity", icon: Radio, badge: "Live" },
  { label: "Compare", to: "/compare", icon: GitCompareArrows },
  { label: "Watchlist", to: "/watchlist", icon: Wallet },
  { label: "Track Record", to: "/track-record", icon: ShieldCheck, badge: "Walrus" },
  { label: "Metrics", to: "/metrics", icon: Activity },
  { label: "Tools", to: "/tools", icon: Wrench },
  { label: "Chains", to: "/chains", icon: Link2 },
  { label: "Yields", to: "/yields", icon: Sprout },
  { label: "Stablecoins", to: "/stablecoins", icon: Coins },
  { label: "RWA", to: "/rwa", icon: Building2 },
  { label: "Support", to: "/support", icon: LifeBuoy },
  { label: "API & MCP", to: "/api", icon: Code2 },
  { label: "DEX Aggregator", to: "/dex", icon: Repeat },
  { label: "Investor Relations", to: "/investors", icon: TrendingUp, badge: "New" },
  { label: "DefiLlama Research", to: "/research", icon: TrendingUp, badge: "New" },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "glass-strong sticky top-0 z-30 flex h-screen flex-col rounded-none border-y-0 border-l-0 transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-[244px]",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30">
          <img src="/hawkk.jpg" alt="DeFi Hawk" className="h-9 w-9 rounded-xl object-cover" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">DeFi Hawk</p>
            <p className="text-[10px] text-muted-foreground">Multi-chain analytics</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-glow"
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_12px_2px] shadow-primary/60"
                />
              )}
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="m-3 flex items-center justify-center gap-2 rounded-xl bg-secondary/50 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
