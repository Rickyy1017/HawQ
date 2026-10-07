import { useEffect, useState } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { MeshBackground } from "./MeshBackground";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { SearchProvider, useSearch } from "./SearchContext";
import { ThemeProvider } from "./ThemeContext";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";

function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { query, setQuery } = useSearch();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  return (
    <div className="flex min-h-screen w-full">
      <MeshBackground />
      <Sidebar
        className="hidden lg:flex"
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="glass-strong w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            mobile
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div id="main-scroll" className="h-screen min-w-0 flex-1 overflow-y-auto">
        <Navbar
          query={query}
          onQuery={setQuery}
          onMenu={() => setMobileOpen(true)}
        />
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-2 sm:px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <ThemeProvider>
      <SearchProvider>
        <Shell />
      </SearchProvider>
    </ThemeProvider>
  );
}
