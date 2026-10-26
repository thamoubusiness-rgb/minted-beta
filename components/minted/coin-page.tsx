"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAlive } from "./alive";

const BuyBox = dynamic(() => import("./buy-box"), { ssr: false, loading: () => <div className="bb bb-skel" aria-hidden="true" /> });
import type { CoinView } from "@/lib/coin";
import { geist, geistMono } from "./fonts";
import { SiteFooter, SiteHeader } from "./site-chrome";
import "./minted.css";

const money = (v: number | null) =>
  v == null ? "—" : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${Math.round(v)}`;
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));
const short = (s: string, a = 4, b = 4) => `${s.slice(0, a)}…${s.slice(-b)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const Badge = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified">
    <path fill="#C6FF34" d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 22.5l-2.4-1.8-3 .2-.9-2.9L3.3 16.2l1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z" />
    <path d="M7.8 12.2l2.6 2.6 5.4-5.6" stroke="#000" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CoinPage({ coin, cluster }: { coin: CoinView; cluster: string }) {
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useAlive(rootRef);
  const explorer = (path: string) => `https://solscan.io/${path}${cluster === "mainnet-beta" ? "" : "?cluster=devnet"}`;
  const share = encodeURIComponent(`The verified coin of @${coin.handle}: $${coin.symbol}. Check the contract before buying. ${typeof window !== "undefined" ? window.location.href : ""}`);
  const holdPct = coin.creatorBalance != null ? (coin.creatorBalance / 1e9) * 100 : null; // pump.fun supply is 1B

  async function copy() {
    try {
      await navigator.clipboard.writeText(coin.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const el = document.getElementById("cpMint");
      if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); }
    }
  }

  return (
    <div ref={rootRef} className={`minted ${geist.variable} ${geistMono.variable}`}>
      <div className="page">
        <div className="orb one" aria-hidden="true" />
        <div className="orb two" aria-hidden="true" style={{ top: 520 }} />
        <SiteHeader />
        <main className="wrap cp">
          <section className="cp-hero" aria-labelledby="cpName" data-reveal="scale">
            <div className="cp-banner" aria-hidden="true" />
            <div className="cp-id">
              <div className="cp-coin">
                {coin.avatar || coin.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coin.avatar || coin.image} alt="" referrerPolicy="no-referrer" />
                ) : null}
              </div>
              <div className="cp-who">
                <div className="cp-name-row">
                  <h1 id="cpName">{coin.name}</h1>
                  <span className="cp-verified"><Badge size={16} />Verified creator</span>
                  {!coin.accountAvailable ? <span className="cp-warn">X account unavailable</span> : null}
                </div>
                <div className="cp-meta">
                  <a href={`https://x.com/${coin.handle}`} target="_blank" rel="noopener">@{coin.handle}</a>
                  <span>{compact(coin.followersNow)} followers</span>
                  <span>Launched {day(coin.launchedAt)}</span>
                </div>
                <p className="cp-bio">{coin.bio || `Official coin of @${coin.handle}`}</p>
              </div>
            </div>
          </section>

          <div className="cp-grid">
            <section className="cp-main" aria-labelledby="cpCoin">
              <div className="cp-ticker-row" data-reveal="">
                <h2 id="cpCoin" className="mono">${coin.symbol}</h2>
                <span className="state">{coin.graduated ? "Graduated to PumpSwap" : <><span className="dot" />On pump.fun bonding curve</>}</span>
              </div>
              <div className="kpis" data-reveal="" style={{ ["--d" as string]: ".08s" }}>
                <div className="kpi spot"><small>Market cap</small>{coin.marketCapUsd != null ? <b data-count={coin.marketCapUsd} data-fmt="money">$0</b> : <b>—</b>}</div>
                <div className="kpi spot"><small>Followers at launch</small><b data-count={coin.followersAtLaunch} data-fmt="compact">0</b></div>
                <div className="kpi spot"><small>Creator&apos;s first buy</small><b>{coin.initialBuySol ? `${coin.initialBuySol} SOL` : "None"}</b></div>
              </div>

              <div className="cp-card spot" data-reveal="" style={{ ["--d" as string]: ".14s" }}>
                <h3>Creator activity</h3>
                <p className="cp-sub">What @{coin.handle} is doing with their own coin.</p>
                <dl className="sum">
                  <div><dt>Creator rewards</dt><dd>{coin.rewardMode === "holders" ? "Paid to holders" : "Paid to the creator"}</dd></div>
                  <div><dt>First buy at launch</dt><dd>{coin.initialBuySol ? `${coin.initialBuySol} SOL` : "None"}</dd></div>
                  <div><dt>Creator holds now</dt><dd>{holdPct == null ? "Updating…" : `${holdPct.toFixed(2)}% of supply`}</dd></div>
                  <div><dt>Creator wallet</dt><dd><a href={explorer(`account/${coin.wallet}`)} target="_blank" rel="noopener">{short(coin.wallet)}</a></dd></div>
                </dl>
                {coin.statsUpdatedAt ? <p className="ln-fine">Updated {new Date(coin.statsUpdatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p> : null}
              </div>

              <div className="cp-card spot" data-reveal="" style={{ ["--d" as string]: ".2s" }}>
                <h3>How this coin was verified</h3>
                <ol className="cp-proof">
                  <li><i><Check /></i><div><b>X account signed in</b><span>@{coin.handle} signed in to NAMA with X.</span></div></li>
                  <li><i><Check /></i><div><b>Wallet proved</b><span>{short(coin.wallet)} signed a message linking it to @{coin.handle}.</span></div></li>
                  <li><i><Check /></i><div><b>{coin.rewardMode === "holders" ? "Launched by the linked wallet" : "On-chain creator matches"}</b><span>{coin.rewardMode === "holders"
                    ? <>{short(coin.wallet)} signed and paid for the launch. Creator fees go to holders through pump.fun holder rewards.</>
                    : <>pump.fun lists {short(coin.wallet)} as this coin&apos;s creator.</>}{" "}
                    {coin.txSignature ? <a href={explorer(`tx/${coin.txSignature}`)} target="_blank" rel="noopener">See the launch transaction</a> : null}</span></div></li>
                </ol>
              </div>
            </section>

            <aside className="cp-side" aria-label="Buy">
              <div className="cp-buy spot" data-reveal="scale" style={{ ["--d" as string]: ".1s" }}>
                <span className="ln-fine">Contract address</span>
                <div className="cp-addr">
                  <code id="cpMint">{coin.mint}</code>
                  <button className="btn btn-ghost" type="button" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
                </div>
                <BuyBox mint={coin.mint} symbol={coin.symbol} graduated={coin.graduated} pumpUrl={coin.pumpUrl} explorer={explorer} />
                <a className="btn btn-ghost btn-wide" href={`https://x.com/intent/post?text=${share}`} target="_blank" rel="noopener">Share on X</a>
              </div>
              <div className="cp-note" role="note" data-reveal="" style={{ ["--d" as string]: ".18s" }}>
                This is the only coin @{coin.handle} can launch on NAMA. A coin using this name or photo with a different address was not launched by them.
              </div>
              <div className="cp-note" role="note" data-reveal="" style={{ ["--d" as string]: ".24s" }}>
                Creator coins are highly speculative and can lose all their value. Read the <a href="/risk">risk notice</a>.
              </div>
            </aside>
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
