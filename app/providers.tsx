"use client";

import type { ReactNode } from "react";

// Wallet providers live in components/minted/wallet-bridge.tsx and load in the browser only.
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
