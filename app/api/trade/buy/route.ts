import { config, LAMPORTS_PER_SOL } from "@/lib/config";
import { sql } from "@/lib/db";
import { fail, json } from "@/lib/session";
import { toPubkey } from "@/lib/solana";
import { buildBuyTx } from "@/lib/trade";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * One-click buy of a verified coin. Only coins listed on NAMA can be bought here, so fans can't be sent
 * to a copycat. The buyer's wallet is the only signer; NAMA takes no fee.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = toPubkey(body.wallet);
  if (!user) return fail("bad_wallet", "Connect your wallet first.");
  const sol = Number(body.sol);
  if (!Number.isFinite(sol) || sol < 0.001 || sol > 50) return fail("bad_amount", "Enter an amount between 0.001 and 50 SOL.");
  const slippage = Math.min(25, Math.max(0.5, Number(body.slippage) || config.slippagePct));

  const [coin] = await sql<{ mint: string; graduated: boolean }[]>`
    select t.mint, t.graduated from tokens t join creators c on c.id = t.creator_id
    where t.mint = ${String(body.mint || "")} and not t.delisted and c.status <> 'delisted'`;
  if (!coin) return fail("not_listed", "This coin isn't verified on NAMA.", 404);
  if (coin.graduated) return fail("graduated", "This coin has graduated from the bonding curve. Buy it on pump.fun.", 409);
  const mint = toPubkey(coin.mint)!;

  try {
    const built = await buildBuyTx({ mint, user, lamports: Math.round(sol * LAMPORTS_PER_SOL), slippagePct: slippage });
    return json({ tx: built.txBase64, blockhash: built.blockhash, lastValidBlockHeight: built.lastValidBlockHeight, expectedTokens: built.expectedTokens });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "INSUFFICIENT_FUNDS") return fail("insufficient_funds", "Not enough SOL in your wallet for this buy and the network fee.");
    if (m === "SLIPPAGE") return fail("slippage", "The price moved too much. Try again or raise slippage.");
    if (m === "GRADUATED") return fail("graduated", "This coin has graduated from the bonding curve. Buy it on pump.fun.", 409);
    console.error("trade/buy failed", m);
    return fail("buy_failed", "We couldn't prepare this buy. Nothing was sent. Try again in a moment.", 500);
  }
}
