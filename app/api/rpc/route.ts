import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Browser -> Solana relay. Public mainnet RPC refuses browser requests, so the page talks to Solana
// through the site. Only the handful of read/send methods the launch flow needs are allowed.
const ALLOWED = new Set([
  "sendTransaction",
  "simulateTransaction",
  "getSignatureStatuses",
  "getLatestBlockhash",
  "getBlockHeight",
  "getBalance",
  "getAccountInfo",
  "getTransaction",
  "getFeeForMessage",
  "isBlockhashValid",
  "getGenesisHash",
  "getVersion",
  "getSlot",
  "getEpochInfo",
]);

type RpcCall = { jsonrpc?: string; id?: unknown; method?: string };

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 64_000) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, { status: 413 });
  let body: RpcCall | RpcCall[];
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length > 10 || calls.some((c) => !c || typeof c.method !== "string" || !ALLOWED.has(c.method))) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32601, message: "Method not allowed" } }, { status: 403 });
  }
  const res = await fetch(config.rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: text, cache: "no-store" });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
