import { randomBytes } from "crypto";
import { config } from "@/lib/config";
import { sql } from "@/lib/db";
import { toPubkey } from "@/lib/solana";
import { currentCreator, fail, json } from "@/lib/session";

export const runtime = "nodejs";

// Step 1 of wallet linking: issue a one-time message for the wallet to sign.
export async function POST(req: Request) {
  const c = await currentCreator();
  if (!c) return fail("unauthorized", "Sign in with X first.", 401);

  const body = await req.json().catch(() => ({}));
  const wallet = toPubkey(body.wallet);
  if (!wallet) return fail("bad_wallet", "That doesn't look like a Solana wallet address.");
  const w = wallet.toBase58();

  const [token] = await sql`select 1 from tokens where creator_id = ${c.id}`;
  if (token) return fail("already_launched", "You've already launched. Your wallet can't be changed.", 409);

  const [taken] = await sql`
    select 1 from wallet_links where wallet = ${w} and creator_id <> ${c.id}
    union select 1 from tokens where creator_wallet = ${w}`;
  if (taken) return fail("wallet_taken", "This wallet is already linked to another X account. Connect a different wallet.", 409);

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from wallet_nonces where creator_id = ${c.id} and created_at > now() - interval '10 minutes'`;
  if (n >= 10) return fail("rate_limited", "Too many attempts. Wait a few minutes and try again.", 429);

  const host = new URL(config.siteUrl).host;
  const nonce = randomBytes(9).toString("base64url");
  const message =
    `${config.siteName} wants to link this wallet to X account @${c.handle} (id ${c.x_user_id}).\n` +
    `Wallet: ${w}\nDomain: ${host}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}\n` +
    `Signing is free and does not send a transaction.`;

  await sql`
    insert into wallet_nonces (creator_id, wallet, message, expires_at)
    values (${c.id}, ${w}, ${message}, now() + interval '5 minutes')`;

  return json({ message });
}
