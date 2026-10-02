import { createContext, useContext, useState, type ReactNode } from "react";

const SearchCtx = createContext<{ query: string; setQuery: (v: string) => void }>({
  query: "",
  setQuery: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchCtx.Provider value={{ query, setQuery }}>{children}</SearchCtx.Provider>;
}

export const useSearch = () => useContext(SearchCtx);
