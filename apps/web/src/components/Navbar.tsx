import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectWallet } from "./ConnectWallet";

export function Navbar({
  query,
  onQuery,
  onMenu,
}: {
  query: string;
  onQuery: (v: string) => void;
  onMenu?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = document.getElementById("main-scroll");
    const handler = () => setScrolled((el?.scrollTop ?? 0) > 8);
    el?.addEventListener("scroll", handler);
    return () => el?.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex flex-wrap items-center gap-2 px-4 py-2.5 transition-all duration-300 sm:gap-3 sm:px-5 lg:flex-nowrap lg:gap-4",
        scrolled ? "glass border-b" : "border-b border-transparent",
      )}
    >
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary/40 text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      <div className="relative order-2 basis-full min-w-0 max-w-none flex-1 lg:order-none lg:basis-auto lg:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search protocols…"
          className="w-full rounded-xl border border-border/80 bg-background/70 py-2 pl-9 pr-3 text-sm shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background focus:shadow-[0_0_0_3px] focus:shadow-primary/15"
        />
      </div>

      <div className="order-1 ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5 lg:order-none">
        <ConnectWallet />
        <ThemeToggle />
      </div>
    </header>
  );
}
