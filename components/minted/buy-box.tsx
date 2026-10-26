"use client";

// One-click buy of a verified coin, right on its NAMA page. Fans only need a wallet, not an X sign-in.
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { VersionedTransaction } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";

type Props = { mint: string; symbol: string; graduated: boolean; pumpUrl: string; explorer: (p: string) => string };
type Phase = { s: "idle" } | { s: "busy"; msg: string } | { s: "done"; sig: string; tokens: number | null } | { s: "err"; msg: string };

const PICKS = ["0.1", "0.25", "0.5", "1"];
const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function Inner({ mint, symbol, graduated, pumpUrl, explorer }: Props) {
  const { wallets, wallet, select, connect, connected, publicKey, signTransaction, disconnect } = useWallet();
  const { connection } = useConnection();
  const [amt, setAmt] = useState("0.25");
  const [slip, setSlip] = useState(5);
  const [picking, setPicking] = useState(false);
  const [phase, setPhase] = useState<Phase>({ s: "idle" });
  const [want, setWant] = useState<string | null>(null);

  const ready = useMemo(() => wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable), [wallets]);

  // Connect right after a wallet is selected.
  useEffect(() => {
    if (want && wallet?.adapter.name === want && !connected) {
      connect().catch(() => setPhase({ s: "err", msg: "The wallet didn't connect. Unlock it and try again." })).finally(() => setWant(null));
    }
  }, [want, wallet, connected, connect]);

  if (graduated) {
    return (
      <div className="bb">
        <p className="bb-note">$<b>{symbol}</b> has graduated from the bonding curve and now trades on PumpSwap.</p>
        <a className="btn btn-solid btn-wide mag" href={pumpUrl} target="_blank" rel="noopener">Buy on pump.fun</a>
      </div>
    );
  }

  const pick = (name: string) => { setPicking(false); setPhase({ s: "idle" }); select(name as never); setWant(name); };
  const openInPhantom = () => { window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(location.href)}?ref=${encodeURIComponent(location.origin)}`; };

  async function buy() {
    if (!publicKey || !signTransaction) return;
    const sol = Number(amt);
    if (!(sol >= 0.001)) { setPhase({ s: "err", msg: "Enter an amount of at least 0.001 SOL." }); return; }
    try {
      setPhase({ s: "busy", msg: "Preparing your buy…" });
      const res = await fetch("/api/trade/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mint, wallet: publicKey.toBase58(), sol, slippage: slip }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "We couldn't prepare this buy.");
      setPhase({ s: "busy", msg: "Approve in your wallet…" });
      const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(data.tx), (c) => c.charCodeAt(0)));
      const signed = await signTransaction(tx);
      setPhase({ s: "busy", msg: "Confirming on Solana…" });
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      for (let i = 0; i < 80; i++) {
        const st = (await connection.getSignatureStatuses([sig])).value[0];
        if (st?.err) throw new Error("The buy failed on Solana. No SOL was spent except the network fee.");
        if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) { setPhase({ s: "done", sig, tokens: data.expectedTokens ?? null }); return; }
        await new Promise((r) => setTimeout(r, 1500));
      }
      throw new Error("Solana is slow to confirm. Check your wallet in a minute.");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setPhase({ s: "err", msg: /reject|denied|cancel/i.test(m) ? "You cancelled. Nothing was sent." : m });
    }
  }

  const busy = phase.s === "busy";
  return (
    <div className="bb">
      <label className="bb-label" htmlFor="bbAmt">You pay</label>
      <div className="buy-in bb-in">
        <input id="bbAmt" type="text" inputMode="decimal" value={amt} disabled={busy}
          onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))} />
        <span>SOL</span>
      </div>
      <div className="qs">
        {PICKS.map((p) => <button key={p} type="button" className={`q${amt === p ? " on" : ""}`} disabled={busy} onClick={() => setAmt(p)}>{p}</button>)}
      </div>
      <div className="bb-row">
        <span>Slippage</span>
        <div className="bb-slip">
          {[1, 5, 10].map((s) => <button key={s} type="button" className={`bb-chip${slip === s ? " on" : ""}`} disabled={busy} onClick={() => setSlip(s)}>{s}%</button>)}
        </div>
      </div>
      <div className="bb-row"><span>NAMA fee</span><b>0 SOL</b></div>

      {!connected ? (
        picking ? (
          <div className="bb-wallets">
            {ready.length ? ready.map((w) => (
              <button key={w.adapter.name} type="button" className="opt" onClick={() => pick(w.adapter.name)}>
                <span className="wl">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={w.adapter.icon} alt="" /></span>
                <span><b>{w.adapter.name}</b><small>Ready to connect</small></span>
              </button>
            )) : isMobile() ? (
              <button type="button" className="btn btn-solid btn-wide" onClick={openInPhantom}>Open in Phantom</button>
            ) : (
              <p className="bb-note">No Solana wallet found. Install <a href="https://phantom.com/download" target="_blank" rel="noopener">Phantom</a>, then refresh.</p>
            )}
          </div>
        ) : (
          <button type="button" className="btn btn-solid btn-wide mag" onClick={() => setPicking(true)}>Connect wallet to buy</button>
        )
      ) : (
        <>
          <button type="button" className={`btn btn-solid btn-wide mag bb-go${busy ? " busy" : ""}`} disabled={busy} onClick={buy}>
            {busy ? <><span className="spin" />{phase.msg}</> : <>Buy ${symbol}</>}
          </button>
          <div className="bb-wallet">
            <span className="dot" />{publicKey!.toBase58().slice(0, 4)}…{publicKey!.toBase58().slice(-4)}
            <button type="button" className="ln-link" onClick={() => { disconnect(); setPhase({ s: "idle" }); }}>Disconnect</button>
          </div>
        </>
      )}

      {phase.s === "done" ? (
        <div className="bb-ok" role="status">
          <b>Bought{phase.tokens ? ` ≈ ${Math.round(phase.tokens).toLocaleString("en-US")}` : ""} ${symbol}</b>
          <a href={explorer(`tx/${phase.sig}`)} target="_blank" rel="noopener">View transaction</a>
        </div>
      ) : null}
      {phase.s === "err" ? <div className="err" role="alert">{phase.msg}</div> : null}
      <a className="bb-alt" href={pumpUrl} target="_blank" rel="noopener">Or open on pump.fun</a>
    </div>
  );
}

export default function BuyBox(props: Props) {
  // The site's relay: public mainnet RPC refuses browser requests.
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || `${window.location.origin}/api/rpc`;
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <Inner {...props} />
      </WalletProvider>
    </ConnectionProvider>
  );
}
