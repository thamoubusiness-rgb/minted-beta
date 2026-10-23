import { sql } from "@/lib/db";
import { finalizeLaunch, type LaunchRow } from "@/lib/launch";
import { pumpCoinUrl } from "@/lib/pump";
import { connection } from "@/lib/solana";
import { currentCreator, fail, json } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

// Called after the wallet sent the transaction. Verifies on-chain, then lists the coin as verified.
export async function POST(req: Request) {
  const c = await currentCreator();
  if (!c) return fail("unauthorized", "Sign in with X first.", 401);

  const body = await req.json().catch(() => ({}));
  if (typeof body.launchId !== "string" || typeof body.signature !== "string") return fail("bad_request", "Missing launch or signature.");

  const [launch] = await sql<LaunchRow[]>`select * from launches where id = ${body.launchId} and creator_id = ${c.id}`;
  if (!launch) return fail("not_found", "Launch not found.", 404);

  const done = async () => {
    const [t] = await sql<{ mint: string; symbol: string; name: string; image_uri: string }[]>`
      select mint, symbol, name, image_uri from tokens where creator_id = ${c.id}`;
    return json({ token: t ? { ...t, url: pumpCoinUrl(t.mint) } : null });
  };
  if (launch.state === "confirmed") return done();

  // 1) The transaction must be confirmed without error.
  const status = (await connection.getSignatureStatus(body.signature, { searchTransactionHistory: true })).value;
  if (!status) return fail("pending", "Still waiting for Solana to confirm. Try again in a few seconds.", 202);
  if (status.err) {
    await sql`update launches set state = 'failed', error = ${JSON.stringify(status.err)}, updated_at = now() where id = ${launch.id}`;
    return fail("tx_failed", "The transaction failed on Solana. No coin was created.", 400);
  }
  if (status.confirmationStatus === "processed") return fail("pending", "Almost there. Waiting for confirmation.", 202);

  // 2) It must be signed by the linked wallet and create this launch's mint.
  const tx = await connection.getTransaction(body.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  if (!tx) return fail("pending", "Still waiting for Solana to confirm. Try again in a few seconds.", 202);
  const keys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((k) => k.toBase58());
  if (keys[0] !== launch.wallet || !keys.includes(launch.mint)) return fail("mismatch", "This transaction doesn't match your launch.", 400);

  // 3) The coin's on-chain creator must be the linked wallet.
  const res = await finalizeLaunch(launch, c, body.signature);
  if (!res.ok) {
    if (res.reason === "already_launched") return fail("already_launched", "You've already launched a coin.", 409);
    return fail("verify_failed", "We couldn't verify the coin on-chain yet. Try again in a few seconds.", 202);
  }
  return done();
}
