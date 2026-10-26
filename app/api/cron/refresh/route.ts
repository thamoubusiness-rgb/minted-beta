import { config } from "@/lib/config";
import { sql } from "@/lib/db";
import { settleOpenLaunches } from "@/lib/launch";
import { refreshTokenStats } from "@/lib/stats";
import type { CreatorRow } from "@/lib/db";
import { solUsd } from "@/lib/solana";
import { lookupUsers, upsertCreator } from "@/lib/x";

export const runtime = "nodejs";
export const maxDuration = 60;

// Runs every 5 minutes (netlify/functions/refresh.mts): lists launches that landed but were never confirmed
// (creator closed the tab), refreshes coin stats, and once a day refreshes X profiles.
export async function GET(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1) Track launches automatically: any sent launch that landed on-chain gets listed even if the
  //    creator's browser never called /api/launch/confirm.
  let listed = 0;
  const openCreators = await sql<CreatorRow[]>`
    select c.* from creators c
    where exists (select 1 from launches l where l.creator_id = c.id and l.state = 'built' and l.created_at > now() - interval '1 day')
      and not exists (select 1 from tokens t where t.creator_id = c.id)
    limit 20`;
  for (const c of openCreators) {
    try { if ((await settleOpenLaunches(c)).landed) listed++; } catch (e) { console.error("settle failed", e); }
  }

  const usd = await solUsd();
  const tokens = await sql<{ mint: string; creator_wallet: string }[]>`
    select mint, creator_wallet from tokens where not delisted
    order by stats_updated_at asc nulls first limit 25`;

  let updated = 0;
  for (const t of tokens) {
    if (await refreshTokenStats(t, usd).catch(() => false)) updated++;
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

  return Response.json({ listed, updated, profiles });
}
