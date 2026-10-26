// Total trading volume per coin, counted from the coin's bonding-curve account.
// Every buy and sell moves SOL in or out of that account, so |change in its SOL balance| per
// transaction is the trade size. We walk forward from the last counted transaction a little at a
// time, so it works on the free public RPC and catches up on its own.
import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config";
import { sql } from "./db";
import { bondingCurveOf } from "./trade";

const fast = new Connection(config.rpcUrl, { commitment: "confirmed", disableRetryOnRateLimit: true });
const BUDGET = 40;      // transactions parsed per refresh, per coin
const CHUNK = 20;

async function allSignaturesSince(curve: PublicKey, until: string | null) {
  // Newest-first pages. With `until` we only get transactions newer than the last counted one.
  const out: { signature: string; err: unknown }[] = [];
  let before: string | undefined;
  for (let page = 0; page < 5; page++) {
    const batch = await fast.getSignaturesForAddress(curve, { limit: 1000, before, until: until ?? undefined }, "confirmed");
    out.push(...batch);
    if (batch.length < 1000) break;
    before = batch[batch.length - 1].signature;
  }
  return out; // newest first
}

export async function updateVolume(mintStr: string): Promise<void> {
  const [row] = await sql<{ volume_last_sig: string | null }[]>`select volume_last_sig from tokens where mint = ${mintStr}`;
  if (!row) return;
  const mint = new PublicKey(mintStr);
  const curve = bondingCurveOf(mint);
  const curveStr = curve.toBase58();

  const pending = (await allSignaturesSince(curve, row.volume_last_sig)).reverse(); // oldest first
  const todo = pending.slice(0, BUDGET);
  if (!todo.length) return;

  let addLamports = 0, trades = 0, lastOk: string | null = null;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const part = todo.slice(i, i + CHUNK);
    let txs;
    try {
      txs = await fast.getParsedTransactions(part.map((s) => s.signature), { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    } catch (e) {
      console.error("volume: tx read failed", e instanceof Error ? e.message : e);
      break; // keep what we counted; continue next refresh
    }
    let stop = false;
    txs.forEach((tx, j) => {
      if (stop) return;
      if (!tx) { stop = true; return; } // not available yet: retry from here next time
      lastOk = part[j].signature;
      if (!tx.meta || tx.meta.err) return;
      const idx = tx.transaction.message.accountKeys.findIndex((k) => k.pubkey.toBase58() === curveStr);
      if (idx < 0) return;
      const pre = tx.meta.preBalances[idx], post = tx.meta.postBalances[idx];
      // The creation transaction also funds the account's rent; don't count that as trading.
      const delta = pre === 0 ? Math.max(0, post - 1_600_000) : Math.abs(post - pre);
      if (delta > 0) { addLamports += delta; trades++; }
    });
    if (stop) break;
  }
  if (!lastOk) return;
  await sql`
    update tokens set
      volume_sol = volume_sol + ${addLamports / 1e9},
      volume_trades = volume_trades + ${trades},
      volume_last_sig = ${lastOk}
    where mint = ${mintStr}`;
}
