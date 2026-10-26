"use client";

import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import { initMinted } from "./init-minted";
import dynamic from "next/dynamic";

const WalletBridge = dynamic(() => import("./wallet-bridge"), { ssr: false });
import "./minted.css";

import { geist, geistMono } from "./fonts";
import { FooterLinks } from "./site-chrome";

/* helpers */
const d = (v: string) => ({ ["--d" as string]: v }) as CSSProperties;

function Split({ text, softFrom = -1 }: { text: string; softFrom?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span
            className="w"
            style={{
              transitionDelay: `${(i * 0.06).toFixed(2)}s`,
              ...(softFrom > -1 && i >= softFrom ? { color: "rgba(255,255,255,.35)" } : {}),
            }}
          >
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

/* icons */
const Sparkle = ({ size = 17, plus = true }: { size?: number; plus?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 3.5 12.6 8a2 2 0 0 0 1.3 1.3L18.5 11l-4.6 1.6a2 2 0 0 0-1.3 1.3L11 18.5 9.4 13.9a2 2 0 0 0-1.3-1.3L3.5 11l4.6-1.6A2 2 0 0 0 9.4 8z" />
    {plus ? <path d="M19 15.5v4M17 17.5h4" /> : null}
  </svg>
);
const XLogo = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8zM16.7 19.2h1.7L7.4 4.7H5.6z" />
  </svg>
);
const Lock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const Badge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
    <path d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 22.5l-2.4-1.8-3 .2-.9-2.9L3.3 16.2l1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z" />
    <path d="M7.8 12.2l2.6 2.6 5.4-5.6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DEMO = process.env.NEXT_PUBLIC_DEMO_DIRECTORY === "1";

export default function MintedLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return initMinted(rootRef.current);
  }, []);

  return (
    <div ref={rootRef} className={`minted ${geist.variable} ${geistMono.variable}`} data-demo={DEMO ? "1" : "0"}>
      <WalletBridge />
      <div className="progress" id="progress" aria-hidden="true" />
      <div className="glow" id="glow" aria-hidden="true" />

      <div className="page">
        <div className="orb one" data-par="0.12" aria-hidden="true" />
        <div className="orb two" data-par="-0.08" aria-hidden="true" />
        <div className="orb three" data-par="0.1" aria-hidden="true" />

        {/* NAV */}
        <header className="nav" id="nav">
          <div className="wrap">
            <a className="logo" href="#top" aria-label="minted home">
              <span className="logo-mark"><Sparkle /></span>
              minted
            </a>
            <nav className="links" id="links" aria-label="Sections">
              <span className="pill-bg" id="pillBg" aria-hidden="true" />
              <a href="#tokenize" data-spy="tokenize">Tokenize</a>
              <a href="#explore" data-spy="explore">Explore</a>
              <a href="#how" data-spy="how">How it works</a>
              <a href="#stats" data-spy="stats">Your stats</a>
            </nav>
            <a className="btn btn-ghost mag" href="#launch" data-launch="" id="navLaunch">Launch your coin</a>
          </div>
        </header>

        <main id="top">
          {/* HERO */}
          <section className="hero wrap" aria-labelledby="hero-title">
            <div className="hero-halo" aria-hidden="true" />
            <div className="hero-inner" id="heroInner">
              <span className="pill" data-reveal="" style={d(".05s")}><span className="dot" />Verified creator coins on Solana</span>
              <h1 className="h1" id="hero-title">
                <span className="line">
                  <span className="w" style={{ transitionDelay: ".10s" }}>Turn</span>{" "}
                  <span className="w" style={{ transitionDelay: ".17s" }}>your</span>{" "}
                  <span className="w" style={{ transitionDelay: ".24s" }}>identity</span>
                </span>
                <span className="line soft">
                  <span className="w" style={{ transitionDelay: ".34s" }}>into</span>{" "}
                  <span className="w" style={{ transitionDelay: ".41s" }}>a</span>{" "}
                  <span className="w" style={{ transitionDelay: ".48s" }}>coin.</span>
                </span>
              </h1>
              <p className="lede" data-reveal="" style={d(".55s")}>
                One coin per X profile, launched by the real account. No fakes, no copycats, and we never hold your keys.
              </p>
              <div className="search" data-reveal="scale" style={d(".65s")}>
                <form id="searchForm" role="search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <label htmlFor="q" className="sr">Search any @handle</label>
                  <input id="q" name="q" type="text" placeholder="Search any @handle" autoComplete="off" spellCheck={false} />
                  <button className="btn btn-solid" type="submit">Find profile</button>
                </form>
              </div>
              <div id="result" hidden />
              <p className="hint" data-reveal="" style={d(".75s")}>See if a coin exists. You only connect X when you launch.</p>
            </div>
            <a className="scroll-cue" href="#tokenize"><span className="mouse" aria-hidden="true" />Scroll to explore</a>
          </section>

          {/* TICKER STRIP */}
          <div className="strip" aria-label="Recent launches">
            <div className="strip-track" id="strip" />
          </div>

          {/* TOKENIZE (pinned) */}
          <section className="tok" id="tokenize" aria-labelledby="tok-title">
            <div className="tok-stage">
              <div className="wrap" style={{ width: "100%" }}>
                <div className="tok-grid">
                  <div className="tok-copy">
                    <span className="eyebrow">Tokenize your profile</span>
                    <h2 id="tok-title">Your X profile becomes the coin. Exactly as it is.</h2>
                    <p style={{ color: "var(--muted)", maxWidth: 400 }}>
                      Name, handle, photo and bio are pulled straight from X and locked. Nobody can dress a coin up as you, including you.
                    </p>
                    <ol className="tok-steps" id="tokSteps">
                      <span className="bar" aria-hidden="true" />
                      <li className="tok-step on cur"><span className="n">1</span><div><strong>Your profile</strong><span>Sign in with X. We read it, we never post.</span></div></li>
                      <li className="tok-step"><span className="n">2</span><div><strong>Locked from X</strong><span>Photo, name, @handle and bio map to the coin.</span></div></li>
                      <li className="tok-step"><span className="n">3</span><div><strong>Minted, verified</strong><span>One signature. Live on pump.fun with your badge.</span></div></li>
                    </ol>
                  </div>

                  <div className="tok-visual" id="tokVisual" aria-hidden="true">
                    <div className="card-x" id="cardX">
                      <div className="x-banner" />
                      <span className="x-tag"><XLogo size={10} />profile</span>
                      <div className="x-body">
                        <div className="av av-lg">YN</div>
                        <div className="x-name">Your Name</div>
                        <div className="x-handle">@yourhandle</div>
                        <p className="x-bio">Building in public. Threads on Solana every Monday.</p>
                        <div className="x-meta"><span><b>612</b> Following</span><span><b>48.2K</b> Followers</span></div>
                      </div>
                    </div>

                    <div className="card-coin spot" id="cardCoin">
                      <div className="stamp" id="stamp"><Badge />Verified</div>
                      <div className="coin-top">
                        <div className="coin" id="coin">
                          <div className="coin-face front"><div className="av">YN</div><span className="shine" /></div>
                          <div className="coin-face back"><Sparkle size={34} plus={false} /></div>
                        </div>
                        <div>
                          <div className="coin-name">Your Name</div>
                          <div className="coin-ticker" id="coinTicker">$YOURHANDLE</div>
                        </div>
                      </div>
                      <div className="fields">
                        <div className="field"><span className="k">Image</span><span className="v">X profile photo</span><span className="lock"><Lock />From X</span></div>
                        <div className="field"><span className="k">Name</span><span className="v">Your Name</span><span className="lock"><Lock />From X</span></div>
                        <div className="field"><span className="k">Ticker</span><span className="v mono">$YOURHANDLE</span><span className="lock"><Lock />From @handle</span></div>
                        <div className="field"><span className="k">Bio</span><span className="v wrap2">Building in public. Threads on Solana every Monday.</span><span className="lock"><Lock />From X</span></div>
                      </div>
                      <div className="coin-live" id="coinLive"><span><span className="dot" />Live on pump.fun</span><span>1 launch per account</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* LATEST LAUNCHES */}
          <section className="sec" id="explore" aria-labelledby="explore-title">
            <div className="wrap">
              <div className="sec-head">
                <div className="t">
                  <span className="eyebrow" data-reveal="">Live directory</span>
                  <h2 id="explore-title" className="split" aria-label="Latest launches"><Split text="Latest launches" /></h2>
                </div>
                <span className="live-tag" data-reveal="" style={d(".12s")}><span className="dot" />Updating live</span>
              </div>
              <div className="list spot" id="list" data-reveal="scale" style={d(".1s")} />
              <div className="more">
                <button className="btn btn-ghost mag" type="button" id="viewAll">
                  <span id="viewAllTxt">View all</span>
                  <svg className="arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                </button>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="sec" id="how" aria-labelledby="how-title" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="wrap how">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow" data-reveal="">Simple by design</span>
                <h2 id="how-title" className="split" aria-label="From profile to coin in three steps."><Split text="From profile to coin in three steps." /></h2>
              </div>
              <ol className="how-cards">
                <li className="how-card spot" data-reveal="" style={d("0s")}>
                  <span className="edge-ring" aria-hidden="true" />
                  <div className="top">01
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></svg>
                  </div>
                  <h3>Connect X</h3>
                  <p>We verify the profile is really yours. We never post for you.</p>
                </li>
                <li className="how-card spot" data-reveal="" style={d(".1s")}>
                  <span className="edge-ring" aria-hidden="true" />
                  <div className="top">02
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></svg>
                  </div>
                  <h3>Prove wallet</h3>
                  <p>Sign a free message to link the wallet you want to use. No SOL moves.</p>
                </li>
                <li className="how-card spot" data-reveal="" style={d(".2s")}>
                  <span className="edge-ring" aria-hidden="true" />
                  <div className="top">03 <Sparkle size={20} /></div>
                  <h3>Sign &amp; launch</h3>
                  <p>Review once, sign once. It&apos;s live on pump.fun.</p>
                </li>
              </ol>
            </div>
          </section>

          {/* TRUST RULES */}
          <section className="sec" aria-labelledby="rules-title" style={{ paddingTop: 16 }}>
            <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow" data-reveal="">Why fans trust it</span>
                <h2 id="rules-title" className="split" aria-label="Built so every coin is the real one."><Split text="Built so every coin is the real one." /></h2>
              </div>
              <div className="rules">
                <div className="rule spot" data-reveal="" style={d("0s")}>
                  <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></span>
                  <h3>Real accounts only</h3>
                  <p>Every coin is launched by the X account it names, proven at sign-in and on-chain.</p>
                </div>
                <div className="rule spot" data-reveal="" style={d(".08s")}>
                  <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span>
                  <h3>Locked to X</h3>
                  <p>Name, ticker, photo and bio come from the profile. Nothing can be edited.</p>
                </div>
                <div className="rule spot" data-reveal="" style={d(".16s")}>
                  <span className="ic mono" style={{ fontSize: 13 }}>1×</span>
                  <h3>One per creator</h3>
                  <p>Each X account and each wallet gets one launch. No second coins, ever.</p>
                </div>
                <div className="rule spot" data-reveal="" style={d(".24s")}>
                  <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg></span>
                  <h3>Creator moves in the open</h3>
                  <p>Every coin page shows the creator&apos;s initial buy, holdings and any sells.</p>
                </div>
              </div>
            </div>
          </section>

          {/* STATS */}
          <section className="sec" id="stats" aria-labelledby="stats-title" style={{ paddingTop: 16 }}>
            <div className="wrap">
              <div className="dash spot" data-reveal="scale">
                <div className="dash-head">
                  <div>
                    <span className="eyebrow">Your launch stats <span className="tag">Example</span></span>
                    <h2 id="stats-title">Your coin, after launch</h2>
                    <p>Market cap, holders and fees show up here once you&apos;re live.</p>
                  </div>
                  <button className="icon-btn" type="button" aria-label="About your stats">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></svg>
                  </button>
                </div>
                <div className="kpis">
                  <div className="kpi"><small>Market cap</small><b className="count" data-to="842000" data-fmt="money">$0</b></div>
                  <div className="kpi"><small>Holders</small><b className="count" data-to="3412" data-fmt="int">0</b></div>
                  <div className="kpi"><small>Creator fees</small><b className="count" data-to="18.4" data-fmt="sol">0 SOL</b></div>
                </div>
                <div className="chart" id="chart">
                  <div className="yax" aria-hidden="true"><span>$1.0M</span><span>$500K</span><span>$0</span></div>
                  <div className="plot" id="plot">
                    <svg viewBox="0 0 960 170" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#a5f3fc" stopOpacity=".14" /><stop offset="1" stopColor="#a5f3fc" stopOpacity="0" /></linearGradient>
                        <linearGradient id="gl" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#6b6b6b" /><stop offset=".7" stopColor="#d4d4d4" /><stop offset="1" stopColor="#a5f3fc" /></linearGradient>
                      </defs>
                      <g className="gridlines"><line x1="0" x2="960" y1="0.5" y2="0.5" /><line x1="0" x2="960" y1="85" y2="85" /><line x1="0" x2="960" y1="169.5" y2="169.5" /></g>
                      <path className="chart-area" id="area" fill="url(#ga)" />
                      <path className="chart-line" id="line" pathLength={1} fill="none" stroke="url(#gl)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <span className="xh" id="xh" />
                    <span className="xh-dot" id="xhDot" />
                    <span className="tip" id="tip"><b id="tipV">$0</b><span id="tipD">Day 1</span></span>
                  </div>
                  <div className="xax"><span>Launch day</span><span>Today</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="wrap cta" id="launch" aria-labelledby="cta-title">
            <h2 id="cta-title" className="split" aria-label="Your profile is ready. Mint it."><Split text="Your profile is ready. Mint it." softFrom={4} /></h2>
            <p data-reveal="" style={d(".3s")}>It takes about a minute. You&apos;ll need your X login and a Solana wallet.</p>
            <div className="hero-ctas" data-reveal="" style={d(".4s")}>
              <a className="btn btn-solid mag" href="#launch" data-launch=""><XLogo />Sign in with X</a>
              <a className="btn btn-ghost mag" href="#explore">See latest launches</a>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer id="footer">
          <div className="wrap">
            <p className="main-line">minted is a verification layer for creator coins. Your wallet always stays yours.</p>
            <p className="fine">Verified means a coin was launched by the real X account. It is not a judgment on value and not financial advice.</p>
            <p className="fine">Not affiliated with X Corp. or pump.fun.{DEMO ? " Demo data shown." : ""}</p>
            <FooterLinks />
          </div>
          <div className="wordmark" id="wordmark" aria-hidden="true">minted</div>
        </footer>
      </div>

      <LaunchPanel />
    </div>
  );
}

/* ---------- launch panel (filled and driven by init-minted.ts) ---------- */
function LaunchPanel() {
  const steps = ["X account", "Wallet", "Review", "Launch"];
  return (
    <div className="ln" id="ln" role="dialog" aria-modal="true" aria-labelledby="lnTitle" aria-hidden="true">
      <div className="ln-back" data-act="close" />
      <div className="ln-panel" id="lnPanel">
        <button className="ln-close" type="button" data-act="close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <aside className="ln-rail">
          <span className="logo"><span className="logo-mark"><Sparkle /></span>minted</span>
          <ol className="ln-steps" id="lnSteps" aria-label="Launch progress">
            <span className="bar" id="lnBar" aria-hidden="true" />
            {steps.map((s, i) => (
              <li className="ln-st" key={s}><span className="n">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <div className="ln-rail-foot">
            <span className="ln-demo" id="lnNet"><span className="dot" />Solana</span>
            <span>Your wallet signs everything. We never hold your keys.</span>
          </div>
        </aside>
        <div className="ln-main" id="lnMain" />
        <aside className="ln-side" aria-label="Coin preview">
          <span className="eyebrow">Your coin</span>
          <div className="pv" id="pv">
            <div className="stamp"><Badge />Verified</div>
            <div className="pv-top">
              <div className="pv-coin"><div className="av" id="pvAv">?</div></div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="pv-name" id="pvName">Waiting for X</div>
                <div className="pv-tick" id="pvTick">$TICKER</div>
              </div>
            </div>
            <div className="fields">
              <div className="field"><span className="k">Image</span><span className="v" id="pvImg">From your X photo</span><span className="lock"><Lock /></span></div>
              <div className="field"><span className="k">Handle</span><span className="v" id="pvHandle">@handle</span><span className="lock"><Lock /></span></div>
              <div className="field"><span className="k">Bio</span><span className="v wrap2" id="pvBio">Your X bio, word for word</span><span className="lock"><Lock /></span></div>
              <div className="field"><span className="k">Wallet</span><span className="v mono" id="pvWallet">Not connected</span><span className="lock" /></div>
              <div className="field"><span className="k">First buy</span><span className="v mono" id="pvBuy">0.5 SOL</span><span className="lock" /></div>
              <div className="field"><span className="k">Rewards</span><span className="v" id="pvRw">To me</span><span className="lock" /></div>
            </div>
            <div className="pv-foot"><span className="state" id="pvState">Draft</span><span id="pvFollow" /></div>
          </div>
          <p className="ln-fine">Everything except the first buy and rewards comes from X and can&apos;t be edited.</p>
        </aside>
      </div>
    </div>
  );
}
