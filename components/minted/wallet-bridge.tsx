"use client";

// Wallet connection + bridge, loaded only in the browser (never during server rendering).
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import LaunchBridge from "./launch-bridge";

export default function WalletBridge() {
  // Default: the site's own relay (/api/rpc), since public Solana RPC refuses browser requests.
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || `${window.location.origin}/api/rpc`;
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <LaunchBridge />
      </WalletProvider>
    </ConnectionProvider>
  );
}
