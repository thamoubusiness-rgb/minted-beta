import { sql } from "@/lib/db";
import { holderRewardsCreator, pumpCoinUrl } from "@/lib/pump";
import { currentCreator, fail, json } from "@/lib/session";
import { toPubkey } from "@/lib/solana";
import { refreshStale } from "@/lib/stats";
import { creatorFeesSol, creatorTrades, topHolders } from "@/lib/trade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MILESTONES = [100_000, 1_000_000];

// Everything a creator needs about their own coin, in one call. Each live read fails soft (null), never the page.
export async function GET() {
  const c = await currentCreator();
  if (!c) return fail("unauthorized", "Sign in with X to see your dashboard.", 401);

  const [t0] = await sql<{ mint: string }[]>`select mint from tokens where creator_id = ${c.id}`;
  if (!t0) return json({ creator: { handle: c.handle, name: c.display_name, avatar: c.avatar_url }, token: null });
  await refreshStale(1, t0.mint).catch(() => {});

  const [t] = await sql<{
    mint: string; symbol: string; name: string; creator_wallet: string; market_cap_usd: string | null; market_cap_sol: string | null;
    creator_balance: string | null; initial_buy_lamports: string; graduated: boolean; launched_at: Date; reward_mode: string;
    followers_at_launch: number; stats_updated_at: Date | null;
  }[]>`select * from tokens where creator_id = ${c.id}`;

  const mint = toPubkey(t.mint)!;
  const wallet = toPubkey(t.creator_wallet)!;
  const feeOwner = t.reward_mode === "holders" ? toPubkey(holderRewardsCreator(t.mint))! : wallet;

  const [fees, holders, trades] = await Promise.all([
    creatorFeesSol(feeOwner),
    topHolders(mint).catch((e) => { console.error("holders read failed", e instanceof Error ? e.message : e); return null; }),
    creatorTrades(wallet, mint).catch((e) => { console.error("trades read failed", e instanceof Error ? e.message : e); return null; }),
  ]);

  const mcap = t.market_cap_usd ? Number(t.market_cap_usd) : null;
  return json({
    creator: { handle: c.handle, name: c.display_name, avatar: c.avatar_url, followers: c.followers },
    token: {
      mint: t.mint,
      symbol: t.symbol,
      name: t.name,
      wallet: t.creator_wallet,
      marketCapUsd: mcap,
      marketCapSol: t.market_cap_sol ? Number(t.market_cap_sol) : null,
      creatorBalance: t.creator_balance ? Number(t.creator_balance) : null,
      initialBuySol: Number(t.initial_buy_lamports) / 1e9,
      graduated: t.graduated,
      launchedAt: t.launched_at,
      rewardMode: t.reward_mode,
      followersAtLaunch: t.followers_at_launch,
      statsUpdatedAt: t.stats_updated_at,
      pumpUrl: pumpCoinUrl(t.mint),
      claimUrl: `https://pump.fun/profile/${t.creator_wallet}`,
      page: `/c/${encodeURIComponent(c.handle)}`,
    },
    fees: { sol: fees, to: t.reward_mode === "holders" ? "holders" : "creator" },
    holders,
    trades,
    milestones: MILESTONES.map((m) => ({ at: m, reached: mcap != null && mcap >= m })),
  });
}
