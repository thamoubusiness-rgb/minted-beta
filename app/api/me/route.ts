import { config } from "@/lib/config";
import { holderRewardsAvailable } from "@/lib/pump";
import { sql } from "@/lib/db";
import { eligibility } from "@/lib/eligibility";
import { currentCreator, json } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Who is signed in, their linked wallet, their coin (if any) and whether they can launch.
export async function GET() {
  const c = await currentCreator();
  if (!c) return json({ signedIn: false, config: { maxBuySol: config.maxBuySol } });

  const [link] = await sql<{ wallet: string }[]>`select wallet from wallet_links where creator_id = ${c.id}`;
  const [token] = await sql<{ mint: string; symbol: string; launched_at: Date }[]>`
    select mint, symbol, launched_at from tokens where creator_id = ${c.id}`;

  return json({
    signedIn: true,
    creator: {
      handle: c.handle,
      name: c.display_name,
      bio: c.bio,
      avatar: c.avatar_url,
      followers: c.followers,
    },
    wallet: link?.wallet ?? null,
    token: token ? { mint: token.mint, symbol: token.symbol, launchedAt: token.launched_at } : null,
    eligibility: eligibility(c, Boolean(token)),
    config: { maxBuySol: config.maxBuySol, holderRewards: await holderRewardsAvailable() },
  });
}
