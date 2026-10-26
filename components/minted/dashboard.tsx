"use client";

import { useEffect, useRef, useState } from "react";
import { geist, geistMono } from "./fonts";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { useAlive } from "./alive";
import "./minted.css";

type Trade = { sig: string; at: string | null; side: "buy" | "sell"; tokens: number; sol: number };
type Data = {
  creator: { handle: string; name: string; avatar: string | null; followers?: number };
  token: null | {
    mint: string; symbol: string; name: string; wallet: string; marketCapUsd: number | null; creatorBalance: number | null;
    initialBuySol: number; graduated: boolean; launchedAt: string; rewardMode: string; pumpUrl: string; claimUrl: string; page: string;
  };
  fees?: { sol: number | null; to: "creator" | "holders" };
  holders?: { count: number; capped: boolean } | null;
  trades?: Trade[] | null;
  milestones?: { at: number; reached: boolean }[];
};

const d = (v: string) => ({ ["--d" as string]: v });
const ago = (iso: string | null) => {
  if (!iso) return "";
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
};
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const moneyShort = (v: number) => (v >= 1e6 ? `$${v / 1e6}M` : `$${v / 1e3}K`);

export default function Dashboard({ site }: { site: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "signedout" | "ready" | "error">("loading");
  useAlive(rootRef, [state]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!alive) return;
      if (res.status === 401) return setState("signedout");
      if (!res.ok) return setState("error");
      setData(await res.json());
      setState("ready");
    };
    load().catch(() => alive && setState("error"));
    const id = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 45000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const t = data?.token;
  const holdPct = t?.creatorBalance != null ? (t.creatorBalance / 1e9) * 100 : null;
  const mcap = t?.marketCapUsd ?? 0;

  return (
    <div ref={rootRef} className={`minted ${geist.variable} ${geistMono.variable}`}>
      <div className="page">
        <div className="orb one" aria-hidden="true" />
        <SiteHeader />
        <main className="wrap db">
          {state === "loading" ? (
            <div className="db-skel" aria-label="Loading your dashboard"><span /><span /><span /><span /></div>
          ) : state === "signedout" ? (
            <section className="db-empty" data-reveal="scale">
              <span className="eyebrow">Creator dashboard</span>
              <h1>Sign in to see your coin</h1>
              <p>Your market cap, holders, creator fees and share kit live here.</p>
              <a className="btn btn-solid mag" href="/?launch=1">Sign in with X</a>
            </section>
          ) : state === "error" ? (
            <section className="db-empty" data-reveal="scale">
              <h1>Couldn&apos;t load your dashboard</h1>
              <p>Refresh the page in a moment.</p>
            </section>
          ) : !t ? (
            <section className="db-empty" data-reveal="scale">
              <span className="eyebrow">Creator dashboard</span>
              <h1>You haven&apos;t launched yet</h1>
              <p>Launch your verified coin and your stats will show up here.</p>
              <a className="btn btn-solid mag" href="/?launch=1">Launch your coin</a>
            </section>
          ) : (
            <>
              <section className="db-head" data-reveal="">
                <div className="db-id">
                  <span className="db-av">{/* eslint-disable-next-line @next/next/no-img-element */}{data!.creator.avatar ? <img src={data!.creator.avatar} alt="" referrerPolicy="no-referrer" /> : null}</span>
                  <div>
                    <span className="eyebrow">Creator dashboard</span>
                    <h1><span className="db-tick">${t.symbol}</span> <span className="db-name">@{data!.creator.handle}</span></h1>
                    <span className="state">{t.graduated ? "Graduated to PumpSwap" : <><span className="dot" />Live on pump.fun</>}</span>
                  </div>
                </div>
                <div className="db-actions">
                  <a className="btn btn-ghost mag" href={t.page}>Coin page</a>
                  <a className="btn btn-ghost mag" href={t.pumpUrl} target="_blank" rel="noopener">pump.fun</a>
                </div>
              </section>

              <section className="db-kpis">
                <div className="kpi spot" data-reveal="" style={d("0s")}><small>Market cap</small>{t.marketCapUsd != null ? <b data-count={t.marketCapUsd} data-fmt="money">$0</b> : <b>—</b>}</div>
                <div className="kpi spot" data-reveal="" style={d(".06s")}><small>Holders</small>{data!.holders ? <b>{data!.holders.capped ? <><span data-count={data!.holders.count}>0</span>+</> : <span data-count={data!.holders.count}>0</span>}</b> : <b>—</b>}</div>
                <div className="kpi spot db-fees" data-reveal="" style={d(".12s")}>
                  <small>{data!.fees?.to === "holders" ? "Fees for holders" : "Creator fees to claim"}</small>
                  {data!.fees?.sol != null ? <b data-count={data!.fees.sol} data-fmt="sol">0 SOL</b> : <b>—</b>}
                  {data!.fees?.to === "creator" ? <a className="db-claim" href={t.claimUrl} target="_blank" rel="noopener">Claim on pump.fun ↗</a> : <span className="db-claim muted">Paid out by pump.fun</span>}
                </div>
                <div className="kpi spot" data-reveal="" style={d(".18s")}><small>You hold</small>{holdPct != null ? <b data-count={holdPct} data-fmt="pct">0%</b> : <b>—</b>}</div>
              </section>

              <section className="db-card spot" data-reveal="" style={d(".1s")}>
                <div className="db-card-h"><h2>Milestones</h2><span className="ln-fine">Unlock share cards as your coin grows</span></div>
                <div className="db-miles">
                  {(data!.milestones || []).map((m) => {
                    const pct = Math.min(100, (mcap / m.at) * 100);
                    return (
                      <div key={m.at} className={`db-mile${m.reached ? " done" : ""}`}>
                        <div className="db-mile-top"><b>{moneyShort(m.at)}</b><span>{m.reached ? "Reached" : `${pct.toFixed(pct < 10 ? 1 : 0)}%`}</span></div>
                        <div className="db-bar"><i style={{ ["--w" as string]: `${Math.max(pct, 1.5)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="db-card" data-reveal="" style={d(".12s")}>
                <div className="db-card-h"><h2>Share kit</h2><span className="ln-fine">Images made from your live coin. Download, then post.</span></div>
                <div className="db-kit">
                  {[
                    { kind: "launch", title: "Launch card", text: `I just launched my verified coin $${t.symbol} on NAMA. The only official one.`, ok: true },
                    { kind: "100k", title: "$100K milestone", text: `$${t.symbol} just crossed $100K market cap. Verified on NAMA.`, ok: !!data!.milestones?.[0]?.reached },
                    { kind: "1m", title: "$1M milestone", text: `$${t.symbol} just crossed $1M market cap. Verified on NAMA.`, ok: !!data!.milestones?.[1]?.reached },
                    { kind: "badge", title: "Verified badge", text: `My only official coin is $${t.symbol}. Verified on NAMA.`, ok: true },
                  ].map((c, i) => {
                    const img = `/api/card/${encodeURIComponent(data!.creator.handle)}/${c.kind}`;
                    const post = `https://x.com/intent/post?text=${encodeURIComponent(`${c.text} ${site}${t.page}`)}`;
                    return (
                      <div key={c.kind} className={`db-kit-item spot${c.ok ? "" : " locked"}`} data-reveal="" style={d(`${0.05 * i}s`)}>
                        <div className={`db-kit-img${c.kind === "badge" ? " wide" : ""}`}>
                          {c.ok ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt={c.title} loading="lazy" /> : <span className="db-lock">Unlocks at {c.kind === "1m" ? "$1M" : "$100K"}</span>}
                        </div>
                        <div className="db-kit-foot">
                          <b>{c.title}</b>
                          {c.ok ? (
                            <div className="db-kit-btns">
                              <a className="btn btn-ghost" href={img} download={`nama-${t.symbol.toLowerCase()}-${c.kind}.png`}>Download</a>
                              <a className="btn btn-solid" href={post} target="_blank" rel="noopener">Post on X</a>
                            </div>
                          ) : <span className="ln-fine">Keep going</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="db-card" data-reveal="" style={d(".14s")}>
                <div className="db-card-h"><h2>Your buys and sells</h2><span className="ln-fine">Public on your coin page too</span></div>
                {data!.trades == null ? <p className="ln-fine">Couldn&apos;t read your trades right now.</p>
                  : data!.trades.length === 0 ? <p className="db-none">No buys or sells from your wallet yet.</p>
                  : (
                    <div className="db-trades">
                      {data!.trades.map((tr, i) => (
                        <a key={tr.sig} className="db-trade" href={`https://solscan.io/tx/${tr.sig}`} target="_blank" rel="noopener" data-reveal="" style={d(`${0.04 * i}s`)}>
                          <span className={`db-side ${tr.side}`}>{tr.side === "buy" ? "Buy" : "Sell"}</span>
                          <span className="mono">{Math.round(tr.tokens).toLocaleString("en-US")} ${t.symbol}</span>
                          <span className="mono">{tr.sol.toFixed(3)} SOL</span>
                          <span className="db-ago">{ago(tr.at)}</span>
                        </a>
                      ))}
                    </div>
                  )}
                <p className="ln-fine">Wallet {short(t.wallet)} · Rewards {t.rewardMode === "holders" ? "to holders" : "to you"}</p>
              </section>
            </>
          )}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
