import { isUniqueViolation, sql, type CreatorRow } from "./db";
import { readCurve } from "./pump";
import { connection } from "./solana";

export type LaunchRow = {
  id: string;
  creator_id: string;
  wallet: string;
  mint: string;
  name: string;
  symbol: string;
  image_uri: string;
  initial_buy_lamports: string;
  last_valid_block_height: string;
  state: "built" | "confirmed" | "expired" | "failed";
  tx_signature: string | null;
};

/** Ticker = @handle in capitals, letters and digits only, max 10 characters. */
export const tickerFor = (handle: string) => handle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "COIN";
/** pump.fun names are capped at 32 characters. */
export const coinName = (displayName: string) => [...displayName].slice(0, 32).join("") || "Creator coin";
export const coinDescription = (c: CreatorRow) => (c.bio.trim() ? c.bio : `Official coin of @${c.handle}`);

/**
 * Lists the coin as verified once three facts hold: the launch belongs to this creator,
 * the mint exists on-chain, and its on-chain creator is the creator's linked wallet.
 */
export async function finalizeLaunch(launch: LaunchRow, creator: CreatorRow, signature: string | null) {
  const curve = await readCurve(launch.mint);
  if (!curve) return { ok: false as const, reason: "not_found" };
  const onchainCreator = (curve as { creator?: { toBase58(): string } }).creator?.toBase58();
  if (onchainCreator !== launch.wallet) return { ok: false as const, reason: "creator_mismatch" };

  try {
    await sql.begin(async (tx) => {
      await tx`
        update launches set state = 'confirmed', tx_signature = coalesce(${signature}, tx_signature), updated_at = now()
        where id = ${launch.id}`;
      await tx`
        insert into tokens (mint, creator_id, creator_wallet, launch_id, name, symbol, image_uri, initial_buy_lamports, followers_at_launch)
        values (${launch.mint}, ${creator.id}, ${launch.wallet}, ${launch.id}, ${launch.name}, ${launch.symbol},
                ${launch.image_uri}, ${launch.initial_buy_lamports}, ${creator.followers})
        on conflict (mint) do nothing`;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false as const, reason: "already_launched" };
    throw e;
  }
  return { ok: true as const };
}

/**
 * Resolves launches still marked "built": lists any that actually landed on-chain,
 * expires the ones whose blockhash can no longer land. Returns launches still in flight.
 */
export async function settleOpenLaunches(creator: CreatorRow): Promise<{ landed: boolean; inFlight: number }> {
  const open = await sql<LaunchRow[]>`select * from launches where creator_id = ${creator.id} and state = 'built'`;
  if (!open.length) return { landed: false, inFlight: 0 };
  const height = await connection.getBlockHeight("confirmed");
  let landed = false;
  let inFlight = 0;
  for (const l of open) {
    const res = await finalizeLaunch(l, creator, null);
    if (res.ok) { landed = true; continue; }
    if (height > Number(l.last_valid_block_height)) {
      await sql`update launches set state = 'expired', updated_at = now() where id = ${l.id}`;
    } else {
      inFlight++;
    }
  }
  return { landed, inFlight };
}
