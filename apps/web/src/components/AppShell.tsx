import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { MeshBackground } from "./MeshBackground";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { SearchProvider, useSearch } from "./SearchContext";
import { ThemeProvider } from "./ThemeContext";

function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const { query, setQuery } = useSearch();

  return (
    <div className="flex min-h-screen w-full">
      <MeshBackground />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div id="main-scroll" className="h-screen flex-1 overflow-y-auto">
        <Navbar query={query} onQuery={setQuery} />
        <main className="mx-auto max-w-7xl px-5 pb-16 pt-2">
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
