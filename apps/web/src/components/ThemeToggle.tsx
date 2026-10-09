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
    <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border/80 bg-background/70 p-1 shadow-sm shadow-black/[0.02]">
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            type="button"
            title={`${opt.label} theme`}
            aria-label={`${opt.label} theme`}
            aria-pressed={active}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-lg transition-all",
              active
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            )}
          >
            <opt.icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
