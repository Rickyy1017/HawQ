import { useCallback, useEffect, useState } from "react";

type InjectedWallet = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
};

type WalletWindow = Window & { ethereum?: InjectedWallet };

function firstAccount(value: unknown): string | null {
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  return value[0];
}

export function useWalletConnection() {
  const [wallet, setWallet] = useState<InjectedWallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const provider = (window as WalletWindow).ethereum;
    if (!provider) return;

    setWallet(provider);
    const handleAccountsChanged = (accounts: unknown) =>
      setAddress(firstAccount(accounts));
    const handleDisconnect = () => setAddress(null);
    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("disconnect", handleDisconnect);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("disconnect", handleDisconnect);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider =
      wallet ??
      (typeof window === "undefined"
        ? undefined
        : (window as WalletWindow).ethereum);
    if (!provider) throw new Error("No EVM wallet was found in this browser.");

    setWallet(provider);
    const account = firstAccount(
      await provider.request({ method: "eth_requestAccounts" }),
    );
    if (!account) throw new Error("The wallet did not return an account.");
    setAddress(account);
    return account;
  }, [wallet]);

  return { address, connect, isAvailable: wallet !== null };
}
