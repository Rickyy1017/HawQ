import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "purple" | "dark" | "light";

const THEMES: Theme[] = ["purple", "dark", "light"];
const STORAGE_KEY = "defihawk-theme";

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void };

const Ctx = createContext<ThemeCtx | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.remove("theme-purple", "theme-dark", "theme-light", "dark");
  el.classList.add(`theme-${theme}`);
  if (theme === "dark") {
    el.classList.add("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("purple");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" &&
      localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const initial = stored && THEMES.includes(stored) ? stored : "purple";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
