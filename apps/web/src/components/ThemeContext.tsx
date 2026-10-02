import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'purple' | 'dark' | 'light';

const THEMES: Theme[] = ['purple', 'dark', 'light'];
const STORAGE_KEY = 'defihawk-theme';

type ThemeContextType = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.remove('theme-purple', 'theme-dark', 'theme-light', 'dark');
  el.classList.add(`theme-${theme}`);
  if (theme === 'dark') {
    el.classList.add('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' &&
      localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const initial = stored && THEMES.includes(stored) ? stored : 'light';
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = (theme: Theme) => {
    setThemeState(theme);
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
