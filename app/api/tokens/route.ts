import { sql } from "@/lib/db";
import { pumpCoinUrl } from "@/lib/pump";
import { json } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  mint: string; name: string; symbol: string; image_uri: string; followers_at_launch: number;
  market_cap_usd: string | null; graduated: boolean; launched_at: Date;
  handle: string; display_name: string; avatar_url: string | null; status: string;
};

// Public directory: verified coins, newest first (or by market cap).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const sort = url.searchParams.get("sort") === "mcap" ? "mcap" : "new";
  const before = url.searchParams.get("before");

  const rows = await sql<Row[]>`
    select t.mint, t.name, t.symbol, t.image_uri, t.followers_at_launch, t.market_cap_usd, t.graduated, t.launched_at,
           c.handle, c.display_name, c.avatar_url, c.status
    from tokens t join creators c on c.id = t.creator_id
    where not t.delisted and c.status <> 'delisted'
      ${before ? sql`and t.launched_at < ${new Date(before)}` : sql``}
    order by ${sort === "mcap" ? sql`t.market_cap_usd desc nulls last` : sql`t.launched_at desc`}
    limit ${limit}`;

  return Response.json(
    {
      tokens: rows.map((r) => ({
        mint: r.mint,
        name: r.display_name,
        handle: r.handle,
        symbol: r.symbol,
        avatar: r.avatar_url || r.image_uri,
        followersAtLaunch: r.followers_at_launch,
        marketCapUsd: r.market_cap_usd ? Number(r.market_cap_usd) : null,
        graduated: r.graduated,
        launchedAt: r.launched_at,
        accountAvailable: r.status === "active",
        url: pumpCoinUrl(r.mint),
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
  );
}
