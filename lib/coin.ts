import { sql } from "./db";
import { pumpCoinUrl } from "./pump";

export type CoinView = {
  mint: string;
  name: string;
  handle: string;
  symbol: string;
  bio: string;
  avatar: string | null;
  image: string;
  followersAtLaunch: number;
  followersNow: number;
  marketCapUsd: number | null;
  marketCapSol: number | null;
  creatorBalance: number | null;
  initialBuySol: number;
  graduated: boolean;
  accountAvailable: boolean;
  wallet: string;
  txSignature: string | null;
  launchedAt: string;
  statsUpdatedAt: string | null;
  pumpUrl: string;
  rewardMode: "creator" | "holders";
};

export async function getCoin(handleRaw: string): Promise<CoinView | null> {
  const handle = decodeURIComponent(handleRaw).replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(handle)) return null;
  const [r] = await sql<
    {
      mint: string; display_name: string; handle: string; symbol: string; bio: string; avatar_url: string | null; image_uri: string;
      followers_at_launch: number; followers: number; market_cap_usd: string | null; market_cap_sol: string | null;
      creator_balance: string | null; initial_buy_lamports: string; graduated: boolean; status: string;
      creator_wallet: string; tx_signature: string | null; reward_mode: string; launched_at: Date; stats_updated_at: Date | null;
    }[]
  >`
    select t.mint, c.display_name, c.handle, t.symbol, c.bio, c.avatar_url, t.image_uri, t.followers_at_launch, c.followers,
           t.market_cap_usd, t.market_cap_sol, t.creator_balance, t.initial_buy_lamports, t.graduated, c.status,
           t.creator_wallet, t.reward_mode, l.tx_signature, t.launched_at, t.stats_updated_at
    from creators c
    join tokens t on t.creator_id = c.id
    left join launches l on l.id = t.launch_id
    where lower(c.handle) = ${handle} and not t.delisted and c.status <> 'delisted'
    limit 1`;
  if (!r) return null;
  return {
    mint: r.mint,
    name: r.display_name,
    handle: r.handle,
    symbol: r.symbol,
    bio: r.bio,
    avatar: r.avatar_url,
    image: r.image_uri,
    followersAtLaunch: r.followers_at_launch,
    followersNow: r.followers,
    marketCapUsd: r.market_cap_usd ? Number(r.market_cap_usd) : null,
    marketCapSol: r.market_cap_sol ? Number(r.market_cap_sol) : null,
    creatorBalance: r.creator_balance ? Number(r.creator_balance) : null,
    initialBuySol: Number(r.initial_buy_lamports) / 1e9,
    graduated: r.graduated,
    accountAvailable: r.status === "active",
    wallet: r.creator_wallet,
    txSignature: r.tx_signature,
    launchedAt: r.launched_at.toISOString(),
    statsUpdatedAt: r.stats_updated_at ? r.stats_updated_at.toISOString() : null,
    pumpUrl: pumpCoinUrl(r.mint),
    rewardMode: r.reward_mode === "holders" ? "holders" : "creator",
  };
}
