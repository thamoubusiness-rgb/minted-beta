"use client";

// Connects the page's launch panel to real services: X sign-in, the user's Solana wallet and our API.
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type Adapter, type MessageSignerWalletAdapter } from "@solana/wallet-adapter-base";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { signIn, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";
import type { MintedBridge } from "@/types/minted";

const FEATURED = ["Phantom", "Solflare", "Backpack"];
const INSTALL: Record<string, string> = {
  Phantom: "https://phantom.com/download",
  Solflare: "https://solflare.com/download",
  Backpack: "https://backpack.app/download",
};

const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
// Opens this page inside the wallet's own in-app browser, where the wallet is available.
const DEEPLINK: Record<string, (url: string) => string> = {
  Phantom: (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(location.origin)}`,
  Solflare: (url) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(location.origin)}`,
};
const reopenUrl = () => {
  const u = new URL(window.location.href);
  u.searchParams.set("launch", "1");
  return u.toString();
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || res.status === 202) {
    const err = new Error(data.message || "Something went wrong. Try again.") as Error & { code?: string; status?: number };
    err.code = data.error;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export default function LaunchBridge() {
  const { wallets } = useWallet();
  const { connection } = useConnection();
  const walletsRef = useRef(wallets);
  const adapterRef = useRef<Adapter | null>(null);
  // The new coin's keypair: made here, never sent anywhere. It signs after the wallet does.
  const mintRef = useRef<Keypair | null>(null);
  walletsRef.current = wallets;

  useEffect(() => {
    const bridge: MintedBridge = {
      cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta",

      me: () => api("/api/me"),

      signInWithX: async () => {
        const url = new URL(window.location.href);
        url.searchParams.set("launch", "1");
        await signIn("twitter", { callbackUrl: url.pathname + url.search });
      },

      signOut: async () => {
        await signOut({ redirect: false });
      },

      wallets: () => {
        const list = walletsRef.current;
        const names = Array.from(new Set([...FEATURED, ...list.map((w) => w.adapter.name)]));
        return names.slice(0, 5).map((name) => {
          const w = list.find((x) => x.adapter.name === name);
          const installed = !!w && (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);
          const mobileApp = !installed && isMobile() && DEEPLINK[name] ? DEEPLINK[name](reopenUrl()) : null;
          return { name, icon: w?.adapter.icon || "", installed, url: mobileApp || w?.adapter.url || INSTALL[name] || "#", mobileApp: Boolean(mobileApp) };
        });
      },

      connectWallet: async (name) => {
        const w = walletsRef.current.find((x) => x.adapter.name === name);
        if (!w || (w.readyState !== WalletReadyState.Installed && w.readyState !== WalletReadyState.Loadable)) {
          if (isMobile() && DEEPLINK[name]) {
            // On a phone: reopen NAMA inside the wallet app. Sign-in is kept, the panel reopens there.
            window.location.href = DEEPLINK[name](reopenUrl());
            throw Object.assign(new Error(`Opening NAMA in the ${name} app…`), { code: "redirecting" });
          }
          window.open(INSTALL[name] || w?.adapter.url || "https://phantom.com/download", "_blank", "noopener");
          throw Object.assign(new Error(`${name} isn't installed. Install it, refresh this page and try again.`), { code: "not_installed" });
        }
        if (!w.adapter.connected) await w.adapter.connect();
        const pk = w.adapter.publicKey;
        if (!pk) throw new Error(`${name} didn't share an address. Unlock it and try again.`);
        adapterRef.current = w.adapter;
        const address = pk.toBase58();
        return { name, address, short: `${address.slice(0, 4)}…${address.slice(-4)}` };
      },

      getLinkMessage: async (wallet) => {
        const r = await api<{ message: string }>("/api/wallet/nonce", { method: "POST", body: JSON.stringify({ wallet }) });
        return r.message;
      },

      signAndLink: async (wallet, message) => {
        const a = adapterRef.current as MessageSignerWalletAdapter | null;
        if (!a || typeof a.signMessage !== "function") throw new Error("This wallet can't sign messages. Try Phantom, Solflare or Backpack.");
        const sig = await a.signMessage(new TextEncoder().encode(message));
        await api("/api/wallet/verify", { method: "POST", body: JSON.stringify({ wallet, signature: bs58.encode(sig) }) });
      },

      build: (initialBuySol, rewardMode) => {
        const kp = Keypair.generate();
        mintRef.current = kp;
        return api("/api/launch/build", { method: "POST", body: JSON.stringify({ initialBuySol, rewardMode, mint: kp.publicKey.toBase58() }) });
      },

      send: async (txBase64) => {
        const a = adapterRef.current;
        if (!a || !a.connected) throw Object.assign(new Error("Your wallet disconnected. Reconnect it and try again."), { code: "disconnected" });
        const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0)));
        const mintKp = mintRef.current;
        if (!mintKp || !tx.message.staticAccountKeys.some((k) => k.equals(mintKp.publicKey))) {
          throw Object.assign(new Error("This launch was prepared in another tab. Go back to review and try again."), { code: "stale" });
        }
        try {
          // 1) The wallet signs first: wallets warn when a transaction arrives already signed by someone else.
          // 2) Then the coin's own key adds its signature, here in the browser.
          // 3) Sent through the site's RPC so it lands on the site's network.
          const signer = a as Adapter & { signTransaction?: (t: VersionedTransaction) => Promise<VersionedTransaction> };
          if (typeof signer.signTransaction === "function") {
            const signed = await signer.signTransaction(tx);
            signed.sign([mintKp]);
            return await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
          }
          tx.sign([mintKp]);
          return await a.sendTransaction(tx, connection, { skipPreflight: false, maxRetries: 3 });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/reject|denied|cancel/i.test(msg)) throw Object.assign(new Error("You rejected the transaction."), { code: "rejected" });
          throw e;
        }
      },

      waitForConfirmation: async (signature, blockhash, lastValidBlockHeight) => {
        // Poll instead of websockets (the relay is HTTP only). Stops when confirmed, failed or expired.
        void blockhash;
        for (let i = 0; i < 90; i++) {
          const st = (await connection.getSignatureStatuses([signature])).value[0];
          if (st?.err) throw Object.assign(new Error("The transaction failed on Solana. No coin was created."), { code: "tx_failed" });
          if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return;
          if (i % 5 === 4 && (await connection.getBlockHeight("confirmed")) > lastValidBlockHeight) {
            throw Object.assign(new Error("The transaction expired before Solana picked it up. Nothing was charged. Try again."), { code: "expired" });
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        throw new Error("Solana is slow to confirm. Your coin will appear automatically if it went through.");
      },

      confirm: async (launchId, signature) => {
        // The server can lag the client's RPC by a few seconds: retry while it reports "pending".
        for (let i = 0; i < 12; i++) {
          try {
            const r = await api<{ token: { mint: string; symbol: string; name: string; url: string } }>("/api/launch/confirm", {
              method: "POST",
              body: JSON.stringify({ launchId, signature }),
            });
            if (r.token) return r.token;
          } catch (e) {
            const err = e as Error & { status?: number };
            if (err.status !== 202) throw e;
          }
          await new Promise((res) => setTimeout(res, 2500));
        }
        throw new Error("Your coin is on-chain but verification is slow. Refresh in a minute; it will appear automatically.");
      },

      tokens: async (query?: string) => (await api<{ tokens: Awaited<ReturnType<MintedBridge["tokens"]>> }>(`/api/tokens${query ? `?${query}` : ""}`)).tokens,

      stats: () => api("/api/stats"),

      search: (handle) => api<Awaited<ReturnType<MintedBridge["search"]>>>(`/api/search?handle=${encodeURIComponent(handle)}`),
    };
    window.__minted = bridge;
    window.dispatchEvent(new Event("minted:bridge"));
    return () => {
      if (window.__minted === bridge) delete window.__minted;
    };
  }, [connection]);

  return null;
}
