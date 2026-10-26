"use client";

// Wallet connection + bridge, loaded only in the browser (never during server rendering).
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import LaunchBridge from "./launch-bridge";

export default function WalletBridge() {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ||
    ((process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta") === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <LaunchBridge />
      </WalletProvider>
    </ConnectionProvider>
  );
}
