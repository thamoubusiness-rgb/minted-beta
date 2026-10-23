import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config";

const g = globalThis as unknown as { __mintedConn?: Connection };
export const connection = g.__mintedConn ?? new Connection(config.rpcUrl, "confirmed");
if (process.env.NODE_ENV !== "production") g.__mintedConn = connection;

export function toPubkey(v: unknown): PublicKey | null {
  if (typeof v !== "string" || v.length < 32 || v.length > 44) return null;
  try {
    const k = new PublicKey(v);
    return PublicKey.isOnCurve(k.toBytes()) ? k : null;
  } catch {
    return null;
  }
}

/** SOL price in USD from Jupiter's public price API. Returns null if unavailable. */
export async function solUsd(): Promise<number | null> {
  try {
    const res = await fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", { cache: "no-store" });
    const j = (await res.json()) as Record<string, { usdPrice?: number }>;
    return j["So11111111111111111111111111111111111111112"]?.usdPrice ?? null;
  } catch {
    return null;
  }
}
