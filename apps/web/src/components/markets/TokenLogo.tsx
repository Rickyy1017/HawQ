import { useEffect, useState } from "react";

type LogoSource = "market" | "icons" | "fallback";

function iconSymbol(symbol: string) {
  const ticker = symbol
    .replace(/-PERP$/i, "")
    .split(":")
    .at(-1)
    ?.replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (ticker === "UBTC") return "BTC";
  if (ticker === "UETH") return "ETH";
  if (ticker === "USOL") return "SOL";
  return ticker || "CRYPTO";
}

export function TokenLogo({
  symbol,
  logoUrl,
  className = "h-10 w-10",
}: {
  symbol: string;
  logoUrl?: string;
  className?: string;
}) {
  const [source, setSource] = useState<LogoSource>(
    logoUrl ? "market" : "icons",
  );
  const ticker = iconSymbol(symbol);
  const src =
    source === "market"
      ? logoUrl
      : source === "icons"
        ? `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${ticker.toLowerCase()}.png`
        : undefined;

  useEffect(() => {
    setSource(logoUrl ? "market" : "icons");
  }, [logoUrl, symbol]);

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/70 ${className}`}
      aria-label={`${ticker} token`}
    >
      {src ? (
        <img
          src={src}
          alt={`${ticker} logo`}
          className="h-[78%] w-[78%] object-contain"
          loading="lazy"
          onError={() =>
            setSource((current) =>
              current === "market" ? "icons" : "fallback",
            )
          }
        />
      ) : (
        <span className="text-xs font-bold text-muted-foreground">
          {ticker.slice(0, 3)}
        </span>
      )}
    </div>
  );
}
