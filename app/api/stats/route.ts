import { sql } from "@/lib/db";
import { refreshStale } from "@/lib/stats";
import { solUsd } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public platform numbers for the stats strip.
export async function GET() {
  await refreshStale(3).catch(() => {});
  const [t] = await sql<{ coins: number; mcap: string | null; graduated: number; holders_rewards: number; vol: string | null; trades: number }[]>`
    select count(*)::int as coins, sum(market_cap_usd) as mcap, sum(volume_sol) as vol, coalesce(sum(volume_trades), 0)::int as trades,
           count(*) filter (where graduated)::int as graduated,
           count(*) filter (where reward_mode = 'holders')::int as holders_rewards
    from tokens t join creators c on c.id = t.creator_id
    where not t.delisted and c.status <> 'delisted'`;
  // Creators who proved a wallet, minus anyone whose coin was delisted (e.g. test launches).
  const [v] = await sql<{ n: number }[]>`
    select count(*)::int as n from wallet_links w join creators c on c.id = w.creator_id
    where c.status <> 'delisted' and not exists (select 1 from tokens t where t.creator_id = w.creator_id and t.delisted)`;
  const usd = await solUsd();
  const volumeSol = t.vol ? Number(t.vol) : 0;
  return Response.json(
    { coins: t.coins, marketCapUsd: t.mcap ? Number(t.mcap) : 0, volumeSol, volumeUsd: usd ? volumeSol * usd : 0, trades: t.trades, graduated: t.graduated, holderRewardCoins: t.holders_rewards, verifiedCreators: v.n },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } }
  );
}
