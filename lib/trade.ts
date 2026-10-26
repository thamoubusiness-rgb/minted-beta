// One-click buy and creator-dashboard reads. Everything pump.fun-specific stays in this file and pump.ts.
import BN from "bn.js";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as pump from "@pump-fun/pump-sdk";
import { OnlinePumpSdk, PUMP_SDK } from "@pump-fun/pump-sdk";
import { config } from "./config";
import { connection } from "./solana";

// Dashboard reads use a connection that fails fast on rate limits instead of retrying for many seconds.
// (A private RPC such as Helius in SOLANA_RPC_URL removes these limits.)
const fast = new Connection(config.rpcUrl, { commitment: "confirmed", disableRetryOnRateLimit: true });

/** Resolves to null if `p` takes longer than `ms`. */
export const within = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), ms))]);

// Short-lived cache so repeated dashboard loads don't hit the RPC every time.
const cache = new Map<string, { at: number; v: unknown }>();
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v as T;
  const v = await fn();
  if (v != null) cache.set(key, { at: Date.now(), v });
  return v;
}

export const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

// The SDK has changed its builder names between versions; call whichever this build ships with.
type AnyFn = (...a: unknown[]) => unknown;
const pick = (names: string[], ...targets: unknown[]): AnyFn | null => {
  for (const t of targets) for (const n of names) {
    const f = (t as Record<string, unknown>)?.[n];
    if (typeof f === "function") return (f as AnyFn).bind(t);
  }
  return null;
};

export const ataOf = (owner: PublicKey, mint: PublicKey, tokenProgram = TOKEN_2022) =>
  PublicKey.findProgramAddressSync([owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()], ATA_PROGRAM)[0];
export const bondingCurveOf = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("bonding-curve"), mint.toBuffer()], PUMP_PROGRAM)[0];

/** Builds a pump.fun buy for exactly `lamports` of SOL. The buyer's wallet is the only signer. */
export async function buildBuyTx(opts: { mint: PublicKey; user: PublicKey; lamports: number; slippagePct: number }) {
  const { mint, user, lamports, slippagePct } = opts;
  const sdk = new OnlinePumpSdk(connection);
  const global = await sdk.fetchGlobal();
  const feeConfig = await sdk.fetchFeeConfig().catch(() => null);
  const state = (await (sdk as unknown as { fetchBuyState: AnyFn }).fetchBuyState(mint, user, TOKEN_2022)) as Record<string, unknown>;
  const bondingCurve = state.bondingCurve as Record<string, unknown> | undefined;
  if (!bondingCurve) throw new Error("NOT_FOUND");
  if (bondingCurve.complete) throw new Error("GRADUATED");

  const quoteAmount = new BN(lamports);
  let mintSupply: BN | null = null;
  try { mintSupply = new BN((await connection.getTokenSupply(mint)).value.amount); } catch { /* optional */ }

  let ixs: TransactionInstruction[] | null = null;
  let expected: BN | null = null;

  const v3Amount = pick(["getBuyV3TokenAmountFromQuoteAmount"], pump);
  const v3Build = pick(["buyExactQuoteInV3Instructions"], PUMP_SDK, sdk);
  if (v3Amount && v3Build) {
    expected = v3Amount({ global, feeConfig, mintSupply, bondingCurve, amount: quoteAmount, curveBaseTokenBalance: state.curveBaseTokenBalance }) as BN;
    ixs = (await v3Build({
      bondingCurve,
      associatedUserAccountInfo: state.associatedUserAccountInfo ?? null,
      mint,
      user,
      quoteAmount,
      amount: expected,
      slippage: slippagePct,
      quoteTokenProgram: state.quoteTokenProgram,
    })) as TransactionInstruction[];
  } else {
    const amountFn = pick(["getBuyTokenAmountFromSolAmount"], pump)!;
    expected = (() => {
      try { return amountFn({ global, feeConfig, mintSupply, bondingCurve, amount: quoteAmount }) as BN; }
      catch { return amountFn(global, bondingCurve, quoteAmount) as BN; }
    })();
    const build = pick(["buyInstructions"], PUMP_SDK, sdk)!;
    ixs = (await build({
      global,
      bondingCurveAccountInfo: state.bondingCurveAccountInfo,
      bondingCurve,
      associatedUserAccountInfo: state.associatedUserAccountInfo ?? null,
      mint,
      user,
      solAmount: quoteAmount,
      amount: expected,
      slippage: slippagePct,
      tokenProgram: TOKEN_2022,
    })) as TransactionInstruction[];
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: user,
      recentBlockhash: blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.priorityFee }),
        ...ixs,
      ],
    }).compileToV0Message()
  );

  // Fail early (and readably) before the wallet pops up.
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) {
    const logs = (sim.value.logs || []).join("\n") + JSON.stringify(sim.value.err);
    if (/insufficient|0x1\b|Attempt to debit|AccountNotFound/i.test(logs)) throw new Error("INSUFFICIENT_FUNDS");
    if (/slippage|TooMuchSolRequired|TooLittleSolReceived|6002|6003/i.test(logs)) throw new Error("SLIPPAGE");
    console.error("buy simulation failed", logs.slice(0, 800));
    throw new Error("SIMULATION_FAILED");
  }

  return {
    txBase64: Buffer.from(tx.serialize()).toString("base64"),
    blockhash,
    lastValidBlockHeight,
    expectedTokens: expected ? Number(expected.toString()) / 1e6 : null,
  };
}

/** SOL waiting in the creator's fee vault (pump.fun + PumpSwap), in SOL. Null if it can't be read. */
export async function creatorFeesSol(creator: PublicKey): Promise<number | null> {
  try {
    const sdk = new OnlinePumpSdk(fast);
    const f = pick(["getCreatorVaultBalanceBothPrograms", "getCreatorVaultBalance"], sdk);
    if (!f) return null;
    const v = await f(creator);
    return Number((v as { toString(): string }).toString()) / 1e9;
  } catch (e) {
    console.error("creator fees read failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Holders from the largest token accounts (the bonding curve itself is not counted). Max 20 from public RPC. */
export async function topHolders(mint: PublicKey) {
  const largest = await fast.getTokenLargestAccounts(mint, "confirmed");
  const curveAta = ataOf(bondingCurveOf(mint), mint).toBase58();
  const rows = largest.value
    .filter((a) => a.address.toBase58() !== curveAta && Number(a.uiAmount || 0) > 0)
    .map((a) => ({ account: a.address.toBase58(), amount: Number(a.uiAmount || 0) }));
  return { count: rows.length, capped: largest.value.length >= 20, top: rows.slice(0, 10) };
}

/** The creator's own buys and sells of their coin, newest first (last ~10 transactions). */
export async function creatorTrades(owner: PublicKey, mint: PublicKey) {
  const ata = ataOf(owner, mint);
  const sigs = await fast.getSignaturesForAddress(ata, { limit: 10 }, "confirmed");
  if (!sigs.length) return [];
  const txs = await fast.getParsedTransactions(sigs.map((s) => s.signature), { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  const ownerStr = owner.toBase58(), mintStr = mint.toBase58();
  const out: { sig: string; at: string | null; side: "buy" | "sell"; tokens: number; sol: number }[] = [];
  txs.forEach((tx, i) => {
    if (!tx?.meta || tx.meta.err) return;
    const bal = (list: typeof tx.meta.preTokenBalances) =>
      (list || []).filter((b) => b.mint === mintStr && b.owner === ownerStr).reduce((s, b) => s + Number(b.uiTokenAmount.uiAmount || 0), 0);
    const dTok = bal(tx.meta.postTokenBalances) - bal(tx.meta.preTokenBalances);
    if (Math.abs(dTok) < 1e-9) return;
    const idx = tx.transaction.message.accountKeys.findIndex((k) => k.pubkey.toBase58() === ownerStr);
    const dSol = idx >= 0 ? (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / 1e9 : 0;
    out.push({ sig: sigs[i].signature, at: sigs[i].blockTime ? new Date(sigs[i].blockTime! * 1000).toISOString() : null, side: dTok > 0 ? "buy" : "sell", tokens: Math.abs(dTok), sol: Math.abs(dSol) });
  });
  return out;
}
