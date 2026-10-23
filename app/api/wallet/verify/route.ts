import bs58 from "bs58";
import nacl from "tweetnacl";
import { isUniqueViolation, sql } from "@/lib/db";
import { toPubkey } from "@/lib/solana";
import { currentCreator, fail, json } from "@/lib/session";

export const runtime = "nodejs";

// Step 2 of wallet linking: check the signature over the exact message we issued, then link.
export async function POST(req: Request) {
  const c = await currentCreator();
  if (!c) return fail("unauthorized", "Sign in with X first.", 401);

  const body = await req.json().catch(() => ({}));
  const wallet = toPubkey(body.wallet);
  if (!wallet || typeof body.signature !== "string") return fail("bad_request", "Missing wallet or signature.");
  const w = wallet.toBase58();

  const [token] = await sql`select 1 from tokens where creator_id = ${c.id}`;
  if (token) return fail("already_launched", "You've already launched. Your wallet can't be changed.", 409);

  const [nonce] = await sql<{ id: string; message: string }[]>`
    select id, message from wallet_nonces
    where creator_id = ${c.id} and wallet = ${w} and used_at is null and expires_at > now()
    order by created_at desc limit 1`;
  if (!nonce) return fail("expired", "That request expired. Try signing again.", 410);

  let ok = false;
  try {
    ok = nacl.sign.detached.verify(new TextEncoder().encode(nonce.message), bs58.decode(body.signature), wallet.toBytes());
  } catch {
    ok = false;
  }
  if (!ok) return fail("bad_signature", "The signature didn't match this wallet. Try again.", 400);

  await sql`update wallet_nonces set used_at = now() where id = ${nonce.id}`;
  try {
    await sql`
      insert into wallet_links (creator_id, wallet, message, signature)
      values (${c.id}, ${w}, ${nonce.message}, ${body.signature})
      on conflict (creator_id) do update set
        wallet = excluded.wallet, message = excluded.message, signature = excluded.signature, verified_at = now()`;
  } catch (e) {
    if (isUniqueViolation(e)) return fail("wallet_taken", "This wallet is already linked to another X account.", 409);
    throw e;
  }
  return json({ linked: true, wallet: w });
}
