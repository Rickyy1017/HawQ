import { ShieldAlert } from "lucide-react";

export function DemoNotice() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm font-semibold text-foreground"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
      Live market data · simulated orders only. No deposit or wallet required.
    </div>
  );
}
