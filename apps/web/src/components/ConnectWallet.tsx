import { toast } from "sonner";
import { Check, WalletCards } from "lucide-react";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { Button } from "./ui/button";

export function ConnectWallet() {
  const { address, connect, isConnecting } = useWalletConnection();

  const handleClick = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        toast.success("Wallet address copied");
      } catch {
        toast.error("Could not copy the wallet address");
      }
      return;
    }

    try {
      await connect();
      toast.success("Wallet connected", {
        description:
          "Read-only connection. No signature or transaction requested.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not connect the wallet",
      );
    }
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      onClick={handleClick}
      aria-label={
        address ? `Copy connected wallet address ${address}` : "Connect wallet"
      }
      title={
        address ? `Copy wallet address ${address}` : "Connect an EVM wallet"
      }
      disabled={isConnecting}
      className="h-10 shrink-0 gap-2 rounded-xl border-border/80 bg-background/80 px-3 text-xs font-semibold shadow-sm"
    >
      {address ? <Check className="text-success" /> : <WalletCards />}
      <span>
        {shortAddress ?? (isConnecting ? "Connecting..." : "Connect wallet")}
      </span>
    </Button>
  );
}
