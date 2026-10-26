import { PublicKey } from "@solana/web3.js";
import { sql } from "./db";
import { curveMarketCapSol, readCurve } from "./pump";
import { connection, solUsd } from "./solana";
import { updateVolume } from "./volume";

/** Refreshes one coin's market cap, graduation and creator holdings from the chain. */
export async function refreshTokenStats(t: { mint: string; creator_wallet: string }, usd?: number | null): Promise<boolean> {
  const curve = (await readCurve(t.mint)) as (Record<string, unknown> & { complete?: boolean }) | null;
  if (!curve) { console.error("stats: no bonding curve for", t.mint); return false; }
  const price = usd === undefined ? await solUsd() : usd;
  const mcapSol = curveMarketCapSol(curve);

  let balance: number | null = null;
  try {
    const accs = await connection.getParsedTokenAccountsByOwner(new PublicKey(t.creator_wallet), { mint: new PublicKey(t.mint) });
    balance = accs.value.reduce((s, a) => s + Number(a.account.data.parsed.info.tokenAmount.uiAmount || 0), 0);
  } catch { /* keep last value */ }

  await sql`
    update tokens set
      market_cap_sol = ${curve.complete ? sql`market_cap_sol` : mcapSol},
      market_cap_usd = ${curve.complete ? sql`market_cap_usd` : price ? mcapSol * price : null},
      graduated = ${Boolean(curve.complete)},
      creator_balance = coalesce(${balance}, creator_balance),
      stats_updated_at = now()
    where mint = ${t.mint}`;
  // Volume catches up a little on every refresh; failures here never block the stats.
  await updateVolume(t.mint).catch((e) => console.error("volume update failed", t.mint, e instanceof Error ? e.message : e));
  return true;
}

/**
 * Keeps stats fresh without relying on the scheduled job: refreshes up to `max` coins whose numbers
 * are older than two minutes. Called when people load the directory or a coin page.
 */
export async function refreshStale(max = 4, mint?: string): Promise<void> {
  const rows = await sql<{ mint: string; creator_wallet: string }[]>`
    select mint, creator_wallet from tokens
    where not delisted and (stats_updated_at is null or stats_updated_at < now() - interval '2 minutes')
      ${mint ? sql`and mint = ${mint}` : sql``}
    order by stats_updated_at asc nulls first limit ${max}`;
  if (!rows.length) return;
  const usd = await solUsd();
  await Promise.all(rows.map((r) => refreshTokenStats(r, usd).catch((e) => { console.error("stats refresh failed", r.mint, e instanceof Error ? e.message : e); return false; })));
}
