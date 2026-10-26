// Everything that talks to pump.fun lives in this one file.
// If @pump-fun/pump-sdk changes a name or a parameter, fix it here only.
import BN from "bn.js";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as pumpSdk from "@pump-fun/pump-sdk";
import { OnlinePumpSdk, PUMP_SDK, getBuyTokenAmountFromSolAmount } from "@pump-fun/pump-sdk";
import { config } from "./config";
import { connection } from "./solana";

export type BuiltLaunch = {
  mint: string;
  txBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

/**
 * Builds the pump.fun create (Token-2022, create_v2) transaction, optionally with the creator's first buy.
 * The creator's wallet is the fee payer and the on-chain creator. The server only signs with the fresh
 * mint keypair, which is thrown away afterwards. The creator signs and sends from their own wallet.
 */
export async function buildCreateTx(opts: {
  creator: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  initialBuyLamports: number;
  /** true = pump.fun holder-reward coin: the creator fee is paid to holders instead of the creator. */
  holderReward?: boolean;
}): Promise<BuiltLaunch> {
  const sdk = new OnlinePumpSdk(connection);
  const mint = Keypair.generate();
  const { creator, name, symbol, uri, initialBuyLamports } = opts;
  const holderReward = Boolean(opts.holderReward);

  let ixs: TransactionInstruction[];
  const global = await sdk.fetchGlobal();
  if (holderReward && (global as { isHolderRewardEnabled?: boolean }).isHolderRewardEnabled === false) {
    throw new Error("HOLDER_REWARDS_OFF");
  }
  if (initialBuyLamports > 0) {
    const feeConfig = await sdk.fetchFeeConfig().catch(() => null);
    const solAmount = new BN(initialBuyLamports);
    const amount = getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: solAmount });
    const maxSol = new BN(Math.floor(initialBuyLamports * (1 + config.slippagePct / 100)));
    ixs = await PUMP_SDK.createV2AndBuyInstructions({
      global,
      mint: mint.publicKey,
      name,
      symbol,
      uri,
      creator,
      user: creator,
      amount,
      solAmount: maxSol,
      mayhemMode: false,
      holderReward,
    } as Parameters<typeof PUMP_SDK.createV2AndBuyInstructions>[0]);
  } else {
    const ix = await PUMP_SDK.createV2Instruction({
      mint: mint.publicKey,
      name,
      symbol,
      uri,
      creator,
      user: creator,
      mayhemMode: false,
      holderReward,
    } as Parameters<typeof PUMP_SDK.createV2Instruction>[0]);
    ixs = [ix];
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  // Solana caps a transaction at 1232 bytes. Create + first buy is close to that limit, so compute-budget
  // instructions are added only while the transaction still fits (most complete variant first).
  const MAX_TX_BYTES = 1232;
  const variants: TransactionInstruction[][] = [
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.priorityFee }), ...ixs],
    [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.priorityFee }), ...ixs],
    ixs,
  ];
  let tx: VersionedTransaction | null = null;
  for (const instructions of variants) {
    try {
      const candidate = new VersionedTransaction(
        new TransactionMessage({ payerKey: creator, recentBlockhash: blockhash, instructions }).compileToV0Message()
      );
      candidate.sign([mint]);
      if (candidate.serialize().length <= MAX_TX_BYTES) {
        tx = candidate;
        break;
      }
    } catch {
      // Too large to serialize: try the next, smaller variant.
    }
  }
  if (!tx) throw new Error("TX_TOO_LARGE");

  // Fail early with a readable error (e.g. not enough SOL) before the wallet pops up.
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) {
    const logs = (sim.value.logs || []).join("\n");
    // AccountNotFound = the fee payer wallet has never held SOL on this network.
    const lowFunds = /insufficient|0x1\b|Attempt to debit|AccountNotFound/i.test(logs + JSON.stringify(sim.value.err));
    throw new Error(lowFunds ? "INSUFFICIENT_FUNDS" : `SIMULATION_FAILED: ${JSON.stringify(sim.value.err)}`);
  }

  return {
    mint: mint.publicKey.toBase58(),
    txBase64: Buffer.from(tx.serialize()).toString("base64"),
    blockhash,
    lastValidBlockHeight,
  };
}

/** Whether pump.fun currently accepts holder-reward coins on this network (cached for 5 minutes). */
let holderCache: { at: number; on: boolean } | null = null;
export async function holderRewardsAvailable(): Promise<boolean> {
  if (holderCache && Date.now() - holderCache.at < 5 * 60_000) return holderCache.on;
  try {
    const g = (await new OnlinePumpSdk(connection).fetchGlobal()) as { isHolderRewardEnabled?: boolean };
    holderCache = { at: Date.now(), on: g.isHolderRewardEnabled !== false };
  } catch {
    holderCache = { at: Date.now(), on: false };
  }
  return holderCache.on;
}

const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

/** On a holder-reward coin the on-chain creator is this PDA (seeds "holder-rewards" + mint), not a wallet. */
export function holderRewardsCreator(mint: string): string {
  const m = new PublicKey(mint);
  const fromSdk = (pumpSdk as unknown as { holderRewardsPda?: (mint: PublicKey) => PublicKey | [PublicKey, number] }).holderRewardsPda;
  if (typeof fromSdk === "function") {
    const r = fromSdk(m);
    return (Array.isArray(r) ? r[0] : r).toBase58();
  }
  return PublicKey.findProgramAddressSync([Buffer.from("holder-rewards"), m.toBuffer()], PUMP_PROGRAM_ID)[0].toBase58();
}

/** Reads the bonding curve. Returns null if the coin does not exist on-chain. */
export async function readCurve(mint: string) {
  const sdk = new OnlinePumpSdk(connection);
  try {
    const curve = await sdk.fetchBondingCurve(new PublicKey(mint));
    return curve ?? null;
  } catch (e) {
    console.error("readCurve failed", mint, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Market cap in SOL from bonding-curve reserves (pump.fun coins have 6 decimals, 1B supply). */
export function curveMarketCapSol(curve: Record<string, unknown>): number {
  const n = (v: unknown) => (v == null ? NaN : Number((v as { toString(): string }).toString()));
  // Newer SDK versions name the SOL side "quote" (coins can be quoted in other mints).
  const vSol = n(curve.virtualSolReserves ?? curve.virtualQuoteReserves) / 1e9;
  const vTok = n(curve.virtualTokenReserves) / 1e6;
  const supplyRaw = n(curve.tokenTotalSupply);
  const supply = Number.isFinite(supplyRaw) ? supplyRaw / 1e6 : 1_000_000_000;
  if (!Number.isFinite(vSol) || !Number.isFinite(vTok) || !vTok) throw new Error(`Unexpected bonding curve fields: ${Object.keys(curve).join(",")}`);
  return (vSol / vTok) * supply;
}

export const pumpCoinUrl = (mint: string) => `https://pump.fun/coin/${mint}`;
