import { sql } from "@/lib/db";
import { pumpCoinUrl } from "@/lib/pump";
import { json } from "@/lib/session";
import { lookupUsername } from "@/lib/x";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Search bar lookup for an @handle:
 *  - "launched":  the account has a verified coin here (with pump.fun / DEX links, CA and socials)
 *  - "found":     a real X account that hasn't launched yet (with its photo)
 *  - "not_found": no X account with that username
 *  - "unknown":   X couldn't be reached right now
 */
export async function GET(req: Request) {
  const handle = (new URL(req.url).searchParams.get("handle") || "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(handle)) return json({ status: "invalid" });

  const [r] = await sql<{ mint: string; symbol: string; display_name: string; handle: string; avatar_url: string | null; graduated: boolean; reward_mode: string }[]>`
    select t.mint, t.symbol, c.display_name, c.handle, c.avatar_url, t.graduated, t.reward_mode
    from creators c join tokens t on t.creator_id = c.id
    where lower(c.handle) = ${handle} and not t.delisted and c.status <> 'delisted'
    limit 1`;
  if (r) {
    return json({
      status: "launched",
      token: {
        mint: r.mint,
        symbol: r.symbol,
        name: r.display_name,
        handle: r.handle,
        avatar: r.avatar_url,
        graduated: r.graduated,
        rewardMode: r.reward_mode,
        url: pumpCoinUrl(r.mint),
        dexUrl: `https://dexscreener.com/solana/${r.mint}`,
        xUrl: `https://x.com/${r.handle}`,
        page: `/c/${encodeURIComponent(r.handle)}`,
      },
    });
  }

  // Someone who already signed in here: no X API call needed.
  const [known] = await sql<{ handle: string; display_name: string; avatar_url: string | null }[]>`
    select handle, display_name, avatar_url from creators where lower(handle) = ${handle} and status = 'active' limit 1`;
  if (known) return json({ status: "found", profile: { handle: known.handle, name: known.display_name, avatar: known.avatar_url } });

  const p = await lookupUsername(handle);
  if (!p) return json({ status: "unknown" });
  if (!p.found) return json({ status: "not_found" });
  return json({ status: "found", profile: { handle: p.handle, name: p.name, avatar: p.avatar } });
}
