import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createWalletClient, custom, type WalletClient } from "viem";
import { arbitrum } from "viem/chains";

type InjectedWallet = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
};

type WalletWindow = Window & { ethereum?: InjectedWallet };

function firstAccount(value: unknown): `0x${string}` | null {
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  return value[0] as `0x${string}`;
}

interface WalletContextValue {
  address: `0x${string}` | null;
  client: WalletClient | null;
  isAvailable: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<string>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<InjectedWallet | null>(null);
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [client, setClient] = useState<WalletClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyAccount = useCallback(
    (account: `0x${string}` | null, injected: InjectedWallet) => {
      setAddress(account);
      setClient(
        account
          ? createWalletClient({
              account,
              chain: arbitrum,
              transport: custom(injected),
            })
          : null,
      );
    },
    [],
  );

  useEffect(() => {
    const injected = (window as WalletWindow).ethereum;
    if (!injected) return;
    setProvider(injected);

    const handleAccountsChanged = (accounts: unknown) =>
      applyAccount(firstAccount(accounts), injected);
    const handleDisconnect = () => applyAccount(null, injected);

    injected.on?.("accountsChanged", handleAccountsChanged);
    injected.on?.("disconnect", handleDisconnect);
    return () => {
      injected.removeListener?.("accountsChanged", handleAccountsChanged);
      injected.removeListener?.("disconnect", handleDisconnect);
    };
  }, [applyAccount]);

  const connect = useCallback(async () => {
    const injected =
      provider ??
      (typeof window === "undefined"
        ? undefined
        : (window as WalletWindow).ethereum);
    if (!injected) {
      const message = "No EVM wallet was found in this browser.";
      setError(message);
      throw new Error(message);
    }

    setProvider(injected);
    setIsConnecting(true);
    setError(null);
    try {
      const account = firstAccount(
        await injected.request({ method: "eth_requestAccounts" }),
      );
      if (!account) throw new Error("The wallet did not return an account.");
      applyAccount(account, injected);
      return account;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not connect the wallet";
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [provider, applyAccount]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setClient(null);
    setError(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        client,
        isAvailable: provider !== null,
        isConnecting,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletConnection() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error(
      "useWalletConnection must be used within a WalletProvider",
    );
  }
  return ctx;
}
