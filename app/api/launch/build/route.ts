import { config, LAMPORTS_PER_SOL } from "@/lib/config";
import { sql } from "@/lib/db";
import { eligibility } from "@/lib/eligibility";
import { coinDescription, coinName, settleOpenLaunches, tickerFor } from "@/lib/launch";
import { pinImageFromUrl, pinJson } from "@/lib/pinata";
import { buildCreateTx } from "@/lib/pump";
import { toPubkey } from "@/lib/solana";
import { currentCreator, fail, json } from "@/lib/session";
import { refreshCreator } from "@/lib/x";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Builds the launch transaction from the creator's live X profile.
 * The client never sends name, ticker, image or description: they can't be tampered with.
 * The only input is the optional first buy.
 */
export async function POST(req: Request) {
  let c = await currentCreator();
  if (!c) return fail("unauthorized", "Sign in with X first.", 401);

  const body = await req.json().catch(() => ({}));
  const buySol = Number(body.initialBuySol ?? 0);
  if (!Number.isFinite(buySol) || buySol < 0 || buySol > config.maxBuySol) {
    return fail("bad_buy", `First buy must be between 0 and ${config.maxBuySol} SOL.`);
  }
  const initialBuyLamports = Math.round(buySol * LAMPORTS_PER_SOL);

  // One coin per account: check, then resolve anything still pending on-chain.
  const [existing] = await sql`select 1 from tokens where creator_id = ${c.id}`;
  if (existing) return fail("already_launched", "You've already launched. Each X account gets one coin.", 409);
  const open = await settleOpenLaunches(c);
  if (open.landed) return fail("already_launched", "Your earlier launch went through. Each X account gets one coin.", 409);
  if (open.inFlight) return fail("in_progress", "A launch is already in progress. Wait about a minute and try again.", 409);

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from launches where creator_id = ${c.id} and created_at > now() - interval '10 minutes'`;
  if (n >= 5) return fail("rate_limited", "Too many attempts. Wait a few minutes and try again.", 429);

  const [link] = await sql<{ wallet: string }[]>`select wallet from wallet_links where creator_id = ${c.id}`;
  const wallet = toPubkey(link?.wallet);
  if (!wallet) return fail("no_wallet", "Link a wallet before launching.", 400);
  const [walletUsed] = await sql`select 1 from tokens where creator_wallet = ${wallet.toBase58()}`;
  if (walletUsed) return fail("wallet_used", "This wallet has already launched a coin.", 409);

  // Re-read the profile so the coin matches X right now.
  c = await refreshCreator(c);
  const elig = eligibility(c, false);
  if (!elig.ok) {
    const premium = elig.checks[0]?.ok;
    return fail("not_eligible", premium ? "This account can't launch yet." : "Only X Premium accounts can launch. Subscribe to X Premium, then sign in again.", 403);
  }
  if (!c.avatar_url) return fail("no_photo", "Add a profile photo on X, then try again.", 400);

  const name = coinName(c.display_name);
  const symbol = tickerFor(c.handle);
  const description = coinDescription(c);

  try {
    const image = await pinImageFromUrl(c.avatar_url, symbol.toLowerCase());
    const metadataUri = await pinJson(
      {
        name,
        symbol,
        description,
        image,
        showName: true,
        createdOn: config.siteUrl,
        twitter: `https://x.com/${c.handle}`,
        website: `${config.siteUrl}/c/${encodeURIComponent(c.handle)}`,
      },
      `${symbol.toLowerCase()}-metadata`
    );

    const built = await buildCreateTx({ creator: wallet, name, symbol, uri: metadataUri, initialBuyLamports });

    const [launch] = await sql<{ id: string }[]>`
      insert into launches (creator_id, wallet, mint, name, symbol, description, image_uri, metadata_uri,
                            initial_buy_lamports, blockhash, last_valid_block_height)
      values (${c.id}, ${wallet.toBase58()}, ${built.mint}, ${name}, ${symbol}, ${description}, ${image}, ${metadataUri},
              ${initialBuyLamports}, ${built.blockhash}, ${built.lastValidBlockHeight})
      returning id`;

    return json({
      launchId: launch.id,
      mint: built.mint,
      tx: built.txBase64,
      blockhash: built.blockhash,
      lastValidBlockHeight: built.lastValidBlockHeight,
      coin: { name, symbol, description, image },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "INSUFFICIENT_FUNDS") {
      return fail("insufficient_funds", "Your wallet doesn't have enough SOL for the fees and your first buy. Add SOL or lower the first buy.", 400);
    }
    console.error("launch/build failed", msg);
    return fail("build_failed", "We couldn't prepare your launch. Nothing was sent. Try again in a minute.", 500);
  }
}
