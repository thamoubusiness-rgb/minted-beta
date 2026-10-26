import { sql } from "@/lib/db";
import { refreshStale } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public platform numbers for the stats strip.
export async function GET() {
  await refreshStale(3).catch(() => {});
  const [t] = await sql<{ coins: number; mcap: string | null; graduated: number; holders_rewards: number }[]>`
    select count(*)::int as coins, sum(market_cap_usd) as mcap,
           count(*) filter (where graduated)::int as graduated,
           count(*) filter (where reward_mode = 'holders')::int as holders_rewards
    from tokens t join creators c on c.id = t.creator_id
    where not t.delisted and c.status <> 'delisted'`;
  const [v] = await sql<{ n: number }[]>`select count(*)::int as n from wallet_links`;
  return Response.json(
    { coins: t.coins, marketCapUsd: t.mcap ? Number(t.mcap) : 0, graduated: t.graduated, holderRewardCoins: t.holders_rewards, verifiedCreators: v.n },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } }
  );
}
