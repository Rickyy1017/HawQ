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
  isMetaMask?: boolean;
  providers?: InjectedWallet[];
};

type WalletWindow = Window & { ethereum?: InjectedWallet };

function firstAccount(value: unknown): `0x${string}` | null {
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  return value[0] as `0x${string}`;
}

function findInjectedWallet(): InjectedWallet | null {
  if (typeof window === "undefined") return null;
  const injected = (window as WalletWindow).ethereum;
  if (!injected) return null;
  // Browsers may expose several extensions through one ethereum object.
  return (
    injected.providers?.find((candidate) => candidate.isMetaMask) ?? injected
  );
}

function walletError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (code === 4001) return "The wallet request was rejected.";
  if (code === -32002)
    return "A wallet request is already pending. Check your wallet.";
  return error instanceof Error
    ? error.message
    : "Could not connect the wallet.";
}

interface WalletContextValue {
  address: `0x${string}` | null;
  client: WalletClient | null;
  isAvailable: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<string>;
  ensureHyperliquidSigner: () => Promise<void>;
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
    if (findInjectedWallet()) return;
    const handleProviderReady = () => {
      const injected = findInjectedWallet();
      if (injected) setProvider(injected);
    };
    window.addEventListener("ethereum#initialized", handleProviderReady, {
      once: true,
    });
    return () =>
      window.removeEventListener("ethereum#initialized", handleProviderReady);
  }, []);

  useEffect(() => {
    const injected = findInjectedWallet();
    if (!injected) return;
    setProvider(injected);

    let active = true;
    void injected
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (!active) return;
        applyAccount(firstAccount(accounts), injected);
      })
      .catch(() => {
        // Wallets can be locked or unavailable until the user opens the extension.
      });

    const handleAccountsChanged = (accounts: unknown) => {
      applyAccount(firstAccount(accounts), injected);
      setError(null);
    };
    const handleDisconnect = () => {
      applyAccount(null, injected);
    };

    injected.on?.("accountsChanged", handleAccountsChanged);
    injected.on?.("disconnect", handleDisconnect);
    return () => {
      active = false;
      injected.removeListener?.("accountsChanged", handleAccountsChanged);
      injected.removeListener?.("disconnect", handleDisconnect);
    };
  }, [applyAccount, provider]);

  const connect = useCallback(async () => {
    const injected = provider ?? findInjectedWallet();
    if (!injected) {
      const message =
        "No EVM wallet was found. Install or enable MetaMask, then reload.";
      setError(message);
      throw new Error(message);
    }

    setProvider(injected);
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await injected.request({
        method: "eth_requestAccounts",
      });
      const account = firstAccount(accounts);
      if (!account) throw new Error("The wallet did not return an account.");
      applyAccount(account, injected);
      return account;
    } catch (err) {
      const message = walletError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsConnecting(false);
    }
  }, [provider, applyAccount]);

  const ensureHyperliquidSigner = useCallback(async () => {
    const injected = provider ?? findInjectedWallet();
    if (!injected || !address || !client)
      throw new Error("Connect your wallet before placing an order.");

    const currentAccount = firstAccount(
      await injected.request({ method: "eth_accounts" }),
    );
    if (!currentAccount) {
      applyAccount(null, injected);
      throw new Error(
        "Your wallet is disconnected. Reconnect it to place an order.",
      );
    }
    if (currentAccount.toLowerCase() !== address.toLowerCase()) {
      applyAccount(currentAccount, injected);
      throw new Error(
        "Your wallet account changed. Review the updated account and retry.",
      );
    }
  }, [provider, address, client, applyAccount]);

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
        ensureHyperliquidSigner,
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
    throw new Error("useWalletConnection must be used within a WalletProvider");
  }
  return ctx;
}
