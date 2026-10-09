import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";
import {
  LayoutDashboard,
  Activity,
  Wrench,
  Network,
  Sprout,
  Coins,
  Landmark,
  LifeBuoy,
  ChevronDown,
  CandlestickChart,
  Vote,
  ChevronLeft,
  GitCompareArrows,
  Eye,
  Radio,
  ShieldCheck,
  ChartNoAxesCombined,
  ArrowLeftRight,
  ChartCandlestick,
  BriefcaseBusiness,
  BrainCircuit,
} from "lucide-react";

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const GROUPS = [
  {
    label: "HawQ Intelligence",
    icon: BrainCircuit,
    items: [
      { label: "Overview", to: "/", icon: LayoutDashboard },
      { label: "Activity Feed", to: "/activity", icon: Radio },
      { label: "Compare", to: "/compare", icon: GitCompareArrows },
      { label: "Watchlist", to: "/watchlist", icon: Eye },
      { label: "Metrics", to: "/metrics", icon: ChartNoAxesCombined },
      { label: "Tools", to: "/tools", icon: Wrench },
      { label: "Chains", to: "/chains", icon: Network },
      { label: "Yields", to: "/yields", icon: Sprout },
      { label: "Stablecoins", to: "/stablecoins", icon: Coins },
      { label: "RWA", to: "/rwa", icon: Landmark },
    ],
  },
  {
    label: "Trade",
    icon: CandlestickChart,
    items: [
      { label: "Spot", to: "/spot", icon: ArrowLeftRight },
      { label: "Perps", to: "/perps", icon: ChartCandlestick },
      { label: "Quant", to: "/quant", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "Predict",
    icon: Vote,
    items: [
      { label: "Markets", to: "/markets", icon: Vote },
      { label: "My Positions", to: "/my-positions", icon: BriefcaseBusiness },
    ],
  },
] satisfies { label: string; icon: typeof LayoutDashboard; items: NavItem[] }[];

export function Sidebar({
  collapsed,
  onToggle,
  className,
  mobile = false,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
  mobile?: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme } = useTheme();
  const logoSrc =
    theme === "light"
      ? "/hawq-logo-light-mode.svg"
      : "/hawq-logo-white.svg";
  const faviconSrc =
    theme === "light" ? "/favicon-light.svg" : "/favicon-dark.svg";
  const activeGroup =
    GROUPS.find((g) => g.items.some((i) => i.to === path))?.label ?? null;
  const [open, setOpen] = useState<string | null>(activeGroup);
  useEffect(() => {
    setOpen(activeGroup);
  }, [activeGroup]);

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = faviconSrc;
      favicon.type = "image/svg+xml";
      favicon.setAttribute("sizes", "any");
    }
  }, [faviconSrc]);

  return (
    <aside
      className={cn(
        mobile
          ? "flex h-full w-full flex-col"
          : "glass-strong sticky top-0 z-30 flex h-screen flex-col rounded-none border-y-0 border-l-0 transition-[width] duration-300",
        !mobile && (collapsed ? "w-[76px]" : "w-[244px]"),
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <img
          src={logoSrc}
          alt="HawQ logo"
          className="h-11 w-11 shrink-0 object-contain"
        />
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">HawQ</p>
            <p className="text-[10px] text-muted-foreground">
              Multi-chain analytics
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => {
          const expanded = open === group.label;
          return (
            <div key={group.label}>
              <Button
                variant="ghost"
                title={collapsed ? group.label : undefined}
                aria-label={group.label}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : group.label)}
                className={cn(
                  "flex h-10 w-full justify-start gap-3 px-3 text-sm",
                  activeGroup === group.label
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <group.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  </>
                )}
              </Button>
              {expanded && !collapsed && (
                <div className="ml-3 border-l border-border/70 pl-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        path === item.to
                          ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="mt-3 border-t border-border/70 pt-3">
          <Link
            to="/support"
            title={collapsed ? "Support" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
              path === "/support"
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <LifeBuoy className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && "Support"}
          </Link>
        </div>
      </nav>

      <Button
        variant="secondary"
        size="icon"
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn("m-3 shrink-0 self-center", mobile && "hidden")}
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180",
          )}
        />
      </Button>
    </aside>
  );
}
