import { cn } from "../lib/utils";
import { Sparkles, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "./ThemeContext";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "purple", label: "Purple", icon: Sparkles },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            title={`${opt.label} theme`}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              active
                ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <opt.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
