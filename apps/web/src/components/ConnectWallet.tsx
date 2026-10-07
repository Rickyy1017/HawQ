import { toast } from "sonner";
import { Check, WalletCards } from "lucide-react";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { Button } from "./ui/button";

export function ConnectWallet() {
  const { address, connect } = useWalletConnection();

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
      size={address ? "default" : "icon"}
      onClick={handleClick}
      aria-label={
        address ? `Copy connected wallet address ${address}` : "Connect wallet"
      }
      title={
        address ? `Copy wallet address ${address}` : "Connect an EVM wallet"
      }
      className="shrink-0 gap-2 sm:size-auto sm:px-3"
    >
      {address ? <Check className="text-success" /> : <WalletCards />}
      <span className="hidden sm:inline">
        {shortAddress ?? "Connect wallet"}
      </span>
    </Button>
  );
}
