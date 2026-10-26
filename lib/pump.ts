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
}): Promise<BuiltLaunch> {
  const sdk = new OnlinePumpSdk(connection);
  const mint = Keypair.generate();
  const { creator, name, symbol, uri, initialBuyLamports } = opts;

  let ixs: TransactionInstruction[];
  if (initialBuyLamports > 0) {
    const global = await sdk.fetchGlobal();
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
    });
  } else {
    const ix = await PUMP_SDK.createV2Instruction({
      mint: mint.publicKey,
      name,
      symbol,
      uri,
      creator,
      user: creator,
      mayhemMode: false,
    });
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

/** Reads the bonding curve. Returns null if the coin does not exist on-chain. */
export async function readCurve(mint: string) {
  const sdk = new OnlinePumpSdk(connection);
  try {
    const curve = await sdk.fetchBondingCurve(new PublicKey(mint));
    return curve ?? null;
  } catch {
    return null;
  }
}

/** Market cap in SOL from bonding-curve reserves (pump.fun coins have 6 decimals). */
export function curveMarketCapSol(curve: {
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  tokenTotalSupply: BN;
}): number {
  const vSol = Number(curve.virtualSolReserves.toString()) / 1e9;
  const vTok = Number(curve.virtualTokenReserves.toString()) / 1e6;
  const supply = Number(curve.tokenTotalSupply.toString()) / 1e6;
  if (!vTok) return 0;
  return (vSol / vTok) * supply;
}

export const pumpCoinUrl = (mint: string) => `https://pump.fun/coin/${mint}`;
