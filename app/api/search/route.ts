import { sql } from "@/lib/db";
import { pumpCoinUrl } from "@/lib/pump";
import { json } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Look up a handle: returns its verified coin, or null if it hasn't launched here.
export async function GET(req: Request) {
  const handle = (new URL(req.url).searchParams.get("handle") || "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(handle)) return json({ token: null });

  const [r] = await sql<{ mint: string; symbol: string; display_name: string; handle: string; avatar_url: string | null }[]>`
    select t.mint, t.symbol, c.display_name, c.handle, c.avatar_url
    from creators c join tokens t on t.creator_id = c.id
    where lower(c.handle) = ${handle} and not t.delisted
    limit 1`;

  return json({
    token: r ? { mint: r.mint, symbol: r.symbol, name: r.display_name, handle: r.handle, avatar: r.avatar_url, url: pumpCoinUrl(r.mint) } : null,
  });
}
