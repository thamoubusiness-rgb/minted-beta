import { PublicKey } from "@solana/web3.js";
import { config } from "@/lib/config";
import { sql } from "@/lib/db";
import { curveMarketCapSol, readCurve } from "@/lib/pump";
import { connection, solUsd } from "@/lib/solana";
import { lookupUsers, upsertCreator } from "@/lib/x";

export const runtime = "nodejs";
export const maxDuration = 60;

// Runs every 10 minutes (vercel.json): refreshes coin stats; once a day also refreshes X profiles.
export async function GET(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const usd = await solUsd();
  const tokens = await sql<{ mint: string; creator_wallet: string }[]>`
    select mint, creator_wallet from tokens where not delisted
    order by stats_updated_at asc nulls first limit 25`;

  let updated = 0;
  for (const t of tokens) {
    const curve = (await readCurve(t.mint)) as Parameters<typeof curveMarketCapSol>[0] & { complete?: boolean } | null;
    if (!curve) continue;
    const mcapSol = curveMarketCapSol(curve);

    // Creator transparency: how much of their own coin the creator still holds.
    let balance: number | null = null;
    try {
      const accs = await connection.getParsedTokenAccountsByOwner(new PublicKey(t.creator_wallet), { mint: new PublicKey(t.mint) });
      balance = accs.value.reduce((s, a) => s + Number(a.account.data.parsed.info.tokenAmount.uiAmount || 0), 0);
    } catch { /* keep last value */ }

    await sql`
      update tokens set
        market_cap_sol = ${curve.complete ? sql`market_cap_sol` : mcapSol},
        market_cap_usd = ${curve.complete ? sql`market_cap_usd` : usd ? mcapSol * usd : null},
        graduated = ${Boolean(curve.complete)},
        creator_balance = coalesce(${balance}, creator_balance),
        stats_updated_at = now()
      where mint = ${t.mint}`;
    updated++;
  }

  // Once a day (the first run after midnight UTC), re-read X profiles in batches of 100.
  let profiles = 0;
  const now = new Date();
  if (now.getUTCHours() === 0 && now.getUTCMinutes() < 10 && config.xBearer) {
    const creators = await sql<{ x_user_id: string }[]>`
      select c.x_user_id from creators c join tokens t on t.creator_id = c.id where c.status <> 'delisted'`;
    for (let i = 0; i < creators.length; i += 100) {
      const ids = creators.slice(i, i + 100).map((c) => c.x_user_id);
      try {
        const { users, missing } = await lookupUsers(ids);
        for (const u of users) { await upsertCreator(u); profiles++; }
        if (missing.length) await sql`update creators set status = 'unavailable', updated_at = now() where x_user_id = any(${sql.array(missing)})`;
      } catch (e) {
        console.error("profile refresh failed", e);
      }
    }
  }

  return Response.json({ updated, profiles });
}
