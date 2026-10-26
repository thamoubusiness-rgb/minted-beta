// @ts-nocheck
// All interactive behaviour for the minted page: scroll scenes, live directory and the launch flow.
// Real services are reached through window.__minted (see launch-bridge.tsx).
import Lenis from "lenis";

export function initMinted(rootEl: HTMLElement): () => void {
  const root = rootEl;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const B = () => window.__minted;
  // The wallet bridge loads in the browser after this script starts: run fn once it is ready.
  const whenBridge = (fn) => { if (window.__minted) fn(); else { const h = () => fn(); window.addEventListener("minted:bridge", h, { once: true }); cleanups.push(() => window.removeEventListener("minted:bridge", h)); } };
  const cleanups = [];
  let alive = true;
  const on = (t, ev, fn, opts?) => { t.addEventListener(ev, fn, opts); cleanups.push(() => t.removeEventListener(ev, fn, opts)); };
  const every = (fn, ms) => { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); };
  const later = (fn, ms) => { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const DEMO = root.dataset.demo === "1";
  if (!reduce && "IntersectionObserver" in window) root.classList.add("anim");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ramp = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce) {
    try {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      const raf = (t) => { if (!alive) return; lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      cleanups.push(() => lenis.destroy());
    } catch { lenis = null; }
  }
  const scrollToEl = (el) => { if (lenis) lenis.scrollTo(el, { offset: -8 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); };
  on(root, "click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !root.contains(a) || a.hasAttribute("data-launch")) return;
    const id = a.getAttribute("href");
    if (id === "#top") { e.preventDefault(); if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); return; }
    const el = root.querySelector(id);
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
  });

  /* ---------- helpers ---------- */
  const GRADS = ["linear-gradient(135deg,#38bdf8,#2563eb)", "linear-gradient(135deg,#e879f9,#7c3aed)", "linear-gradient(135deg,#fbbf24,#ea580c)", "linear-gradient(135deg,#34d399,#0d9488)"];
  const gradFor = (s) => GRADS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];
  const ticker = (h) => String(h).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "COIN";
  const initials = (n) => { const p = String(n || "?").trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase(); };
  const money = (v) => (v == null ? "—" : v >= 1e6 ? "$" + (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? "$" + (v / 1000).toFixed(v < 1e5 ? 1 : 0) + "K" : "$" + Math.round(v));
  const compact = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n));
  const ago = (iso) => { const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return m < 1 ? "just now" : m < 60 ? m + "m ago" : m < 1440 ? Math.floor(m / 60) + "h ago" : Math.floor(m / 1440) + "d ago"; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const safeUrl = (u) => (typeof u === "string" && /^https:\/\//.test(u) ? esc(u) : "");
  const avatar = (c, cls) => '<span class="av ' + cls + '" style="background:' + gradFor(c.h) + '">' + (safeUrl(c.img) ? '<img src="' + safeUrl(c.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : initials(c.n)) + "</span>";
  const check = '<svg width="14" height="14" viewBox="0 0 24 24" role="img" aria-label="Verified"><path fill="#fff" d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 22.5l-2.4-1.8-3 .2-.9-2.9L3.3 16.2l1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z"/><path d="M7.8 12.2l2.6 2.6 5.4-5.6" stroke="#000" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

  /* ---------- directory data ---------- */
  const DEMO_ROWS = [
    ["Kai Tanaka", "kaitanaka", 187400, 842000, 2], ["Mina Park", "minapark", 92800, 516000, 11], ["Rohan Shah", "rohanbuilds", 61200, 294000, 24],
    ["Zoe Lin", "zoecreates", 44900, 188000, 38], ["Leo Marchetti", "leomarchetti", 33100, 121000, 52], ["Ana Ruiz", "anaruiz", 28700, 97000, 71],
  ].map(([n, h, f, m, a]) => ({ n, h, f, m, t: minsAgo(a), img: null, url: null, mint: h }));
  let creators = DEMO ? DEMO_ROWS.slice() : [];
  const fromApi = (t) => ({ n: t.name, h: t.handle, f: t.followersAtLaunch, m: t.marketCapUsd, t: t.launchedAt, img: t.avatar, url: "/c/" + encodeURIComponent(t.handle), mint: t.mint });

  const list = $("#list");
  let shown = 4;
  const rowHTML = (c, i) =>
    '<div class="who">' + avatar(c, "av-md") + '<div style="min-width:0"><div class="name">' + esc(c.n) + " " + check + '</div><div class="handle">@' + esc(c.h) + "</div></div></div>" +
    '<div class="stats"><div class="stat"><small>Ticker</small><span class="tick">$' + ticker(c.h) + '</span></div><div class="stat"><small>Followers</small><span class="num">' + compact(c.f || 0) + '</span></div><div class="stat"><small>Market cap</small><span class="num mc" data-i="' + i + '">' + money(c.m) + '</span></div><span class="ago num">' + ago(c.t) + "</span>" +
    '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></div>';
  const render = (newMint?) => {
    list.innerHTML = "";
    if (!creators.length) {
      list.innerHTML = '<div class="empty"><div><b>No launches yet</b><span>The first verified creator coin could be yours.</span></div><a class="btn btn-solid mag" href="#launch" data-launch="">Launch your coin</a></div>';
      return;
    }
    creators.slice(0, shown).forEach((c, i) => {
      const a = document.createElement("a");
      a.className = "row" + (newMint && c.mint === newMint && !reduce ? " new" : "");
      a.href = c.url || "#explore";
      a.innerHTML = rowHTML(c, i);
      list.appendChild(a);
    });
  };
  render();
  on($("#viewAll"), "click", () => { shown = shown === 4 ? 12 : 4; render(); $("#viewAllTxt").textContent = shown > 4 ? "Show less" : "View all"; });

  let listSeen = false;
  const countRows = () => {
    if (reduce) return;
    $$(".mc").forEach((el) => {
      const c = creators[+el.getAttribute("data-i")]; if (!c || c.m == null) return;
      const to = c.m, t0 = performance.now();
      const step = (t) => { if (!alive) return; let k = Math.min(1, (t - t0) / 1500); k = 1 - Math.pow(1 - k, 3); el.textContent = money(to * k); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };

  // Real data: load now, then poll; new coins slide in at the top.
  const loadTokens = async () => {
    try {
      const rows = await B()?.tokens();
      if (!rows) return;
      if (!rows.length && DEMO) return;
      const before = creators[0]?.mint;
      const next = rows.map(fromApi);
      const changedMcap = new Map(creators.map((c) => [c.mint, c.m]));
      creators = next;
      render(before && next[0] && next[0].mint !== before ? next[0].mint : undefined);
      // flash market caps that moved
      $$(".mc").forEach((el) => {
        const c = creators[+el.getAttribute("data-i")], old = changedMcap.get(c?.mint);
        if (c && old != null && c.m != null && old !== c.m) { el.classList.add(c.m > old ? "up" : "down"); later(() => el.classList.remove("up", "down"), 700); }
      });
      buildStrip();
    } catch { /* keep what is shown */ }
  };
  whenBridge(loadTokens);
  // Latest launches track themselves: new coins and market caps refresh every 15s while the tab is open.
  every(() => { if (!document.hidden) loadTokens(); }, 15000);
  if (DEMO) {
    every(() => {
      if (document.hidden || !listSeen || !creators.length) return;
      const i = Math.floor(Math.random() * Math.min(shown, creators.length)), c = creators[i];
      if (c.url) return; // only demo rows move on their own
      const dir = Math.random() < 0.62 ? 1 : -1;
      c.m = Math.max(1000, Math.round(c.m * (1 + dir * (1 + Math.random() * 2) / 100)));
      const el = list.querySelector('.mc[data-i="' + i + '"]'); if (!el) return;
      el.textContent = money(c.m); el.classList.remove("up", "down"); void el.offsetWidth; el.classList.add(dir > 0 ? "up" : "down");
      later(() => el.classList.remove("up", "down"), 700);
    }, 4000);
  }

  /* ---------- ticker strip ---------- */
  const strip = $("#strip");
  let sx = 0, stripW = 0;
  const stripItem = (c) => '<span class="strip-item">' + avatar(c, "av-sm") + "@" + esc(c.h) + " minted <b>$" + ticker(c.h) + "</b></span>";
  function buildStrip() {
    strip.parentElement.style.display = creators.length ? "" : "none";
    if (!creators.length) return;
    let items = creators.slice(0, 12);
    while (items.length < 8) items = items.concat(items);
    const html = items.map(stripItem).join("");
    strip.innerHTML = html + html;
    stripW = strip.scrollWidth / 2;
  }
  buildStrip();
  let stripHover = false;
  on(strip.parentElement, "pointerenter", () => { stripHover = true; });
  on(strip.parentElement, "pointerleave", () => { stripHover = false; });
  let lastY = scrollY, boost = 0;
  const loopStrip = () => {
    if (!alive) return;
    if (!reduce && stripW) {
      const dy = scrollY - lastY; lastY = scrollY; boost += (clamp(dy, -60, 60) * 0.06 - boost) * 0.1;
      sx -= stripHover ? 0.15 : 0.55 + Math.abs(boost);
      if (-sx >= stripW) sx += stripW;
      strip.style.transform = "translate3d(" + sx + "px,0,0)";
    }
    requestAnimationFrame(loopStrip);
  };
  requestAnimationFrame(loopStrip);

  /* ---------- search ---------- */
  const q = $("#q"), form = $("#searchForm"), res = $("#result");
  if (!reduce) {
    const words = ["@kaitanaka", "@minapark", "@zoecreates", "@yourhandle"];
    let wi = 0, ci = 0, del = false, stop = false;
    const type = () => {
      if (!alive || stop || q.value) return;
      const w = words[wi];
      if (!del) { ci++; q.placeholder = "Search " + w.slice(0, ci); if (ci === w.length) { del = true; return later(type, 1500); } }
      else { ci--; q.placeholder = "Search " + w.slice(0, ci); if (ci === 0) { del = false; wi = (wi + 1) % words.length; return later(type, 300); } }
      later(type, del ? 38 : 75);
    };
    on(q, "focus", () => { stop = true; q.placeholder = "Search any @handle"; });
    on(q, "blur", () => { if (!q.value) { stop = false; ci = 0; del = false; later(type, 900); } });
    later(type, 1600);
  }
  // Live lookup as you type: real X photo, "not found" for wrong usernames, coin links when launched.
  const iconLink = (href, label, solid?) => '<a class="btn ' + (solid ? "btn-solid" : "btn-ghost") + ' res-btn" href="' + href + '"' + (/^https:/.test(href) ? ' target="_blank" rel="noopener"' : "") + ">" + label + "</a>";
  const resHTML = (v, r) => {
    if (r.status === "launched") {
      const t = r.token, short = t.mint.slice(0, 4) + "…" + t.mint.slice(-4);
      return '<div class="res-top">' + avatar({ n: t.name, h: t.handle, img: t.avatar }, "av-md") +
        '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;font-weight:500">' + esc(t.name) + " " + check + '</div>' +
        '<div class="mono" style="font-size:12.5px;color:var(--sky)">$' + esc(t.symbol) + ' <span style="color:var(--dim)">· @' + esc(t.handle) + (t.rewardMode === "holders" ? " · rewards to holders" : "") + "</span></div></div></div>" +
        '<div class="res-ca"><span class="ln-fine">CA</span><span class="mono" title="' + esc(t.mint) + '">' + esc(short) + '</span><button class="ln-link" type="button" data-copy="' + esc(t.mint) + '">Copy</button></div>' +
        '<div class="res-actions">' +
        (t.graduated ? iconLink(safeUrl(t.dexUrl), "Trade on DEX", true) + iconLink(safeUrl(t.url), "pump.fun") : iconLink(safeUrl(t.url), "Buy on pump.fun", true) + iconLink(safeUrl(t.dexUrl), "Chart")) +
        iconLink(esc(t.page), "Coin page") + iconLink(safeUrl(t.xUrl), "X profile") + "</div>";
    }
    if (r.status === "found") {
      const p = r.profile;
      return '<div class="res-top">' + avatar({ n: p.name, h: p.handle, img: p.avatar }, "av-md") +
        '<div style="flex:1;min-width:0"><div style="font-weight:500">' + esc(p.name) + ' <span style="color:var(--dim);font-weight:400">@' + esc(p.handle) + "</span></div>" +
        '<div style="font-size:12.5px;color:var(--dim)">Hasn’t minted yet. Any coin using this name elsewhere is not verified.</div></div>' +
        '<a class="btn btn-solid" style="min-height:36px;padding:0 12px;font-size:13px" href="#launch" data-launch="" data-handle="' + esc(p.handle) + '">It’s me</a></div>';
    }
    if (r.status === "not_found") {
      return '<div class="res-top"><span class="av av-md" style="background:#1a1a1a;border:1px solid var(--border-2);color:#cfcfcf">?</span><div style="flex:1;min-width:0"><div style="font-weight:500">@' + esc(v) + ' not found</div><div style="font-size:12.5px;color:var(--dim)">No X account uses this username. Check the spelling.</div></div></div>';
    }
    return '<div class="res-top"><span class="av av-md" style="background:#1a1a1a;border:1px solid var(--border-2);color:#cfcfcf">@</span><div style="flex:1;min-width:0"><div style="font-weight:500">@' + esc(v) + '</div><div style="font-size:12.5px;color:var(--dim)">Couldn’t reach X right now. Try again in a moment.</div></div></div>';
  };
  let seq = 0, timer = 0;
  const lookup = async (raw, now?) => {
    const v = raw.trim().replace(/^@/, "").toLowerCase();
    clearTimeout(timer);
    const my = ++seq;
    if (!/^[a-z0-9_]{1,15}$/.test(v) || (!now && v.length < 2)) { res.hidden = true; return; }
    const go = async () => {
      res.className = "result rich"; res.hidden = false;
      res.innerHTML = '<div class="res-top"><span class="spin"></span><span style="color:var(--muted)">Looking up @' + esc(v) + "…</span></div>";
      let r;
      try { r = await B()?.search(v); } catch { r = { status: "unknown" }; }
      if (!r && DEMO) { const d = creators.find((c) => c.h === v); r = d ? { status: "found", profile: { handle: d.h, name: d.n, avatar: null } } : { status: "unknown" }; }
      if (my !== seq) return; // a newer keystroke won
      res.innerHTML = resHTML(v, r || { status: "unknown" });
    };
    if (now) go(); else timer = window.setTimeout(go, 450);
  };
  on(q, "input", () => lookup(q.value));
  on(form, "submit", (e) => { e.preventDefault(); lookup(q.value, true); });
  on(res, "click", async (e) => {
    const b = e.target.closest && e.target.closest("[data-copy]"); if (!b) return;
    try { await navigator.clipboard.writeText(b.getAttribute("data-copy")); b.textContent = "Copied"; later(() => { b.textContent = "Copy"; }, 1500); } catch { /* clipboard blocked */ }
  });

  /* ---------- reveal on scroll ---------- */
  const fmt = (v, f) => (f === "money" ? money(v) : f === "sol" ? v.toFixed(1) + " SOL" : Math.round(v).toLocaleString("en-US"));
  const countKpis = () => {
    $$(".count").forEach((el) => {
      const to = +el.getAttribute("data-to"), f = el.getAttribute("data-fmt");
      if (reduce) { el.textContent = fmt(to, f); return; }
      const t0 = performance.now();
      const step = (t) => { if (!alive) return; let k = Math.min(1, (t - t0) / 1800); k = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * k, f); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };
  const onIn = (el) => {
    el.classList.add("in");
    if (el.id === "list") { listSeen = true; countRows(); }
    if (el.classList.contains("kpis")) countKpis();
  };
  const revealEls = $$("[data-reveal], .split, #chart, .kpis");
  if (root.classList.contains("anim")) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { onIn(en.target); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());
  } else { revealEls.forEach(onIn); listSeen = true; }

  /* ---------- example chart ---------- */
  const pts = [12, 14, 16, 15, 19, 22, 21, 26, 31, 29, 35, 41, 38, 46, 52, 49, 57, 63, 60, 68, 74, 71, 79, 84];
  const W = 960, H = 170, maxV = 100;
  const px = (i) => (i / (pts.length - 1)) * W, py = (v) => H - (v / maxV) * H;
  let dLine = "M" + px(0) + " " + py(pts[0]);
  for (let i = 1; i < pts.length; i++) { const x0 = px(i - 1), x1 = px(i), cx = (x0 + x1) / 2; dLine += " C" + cx + " " + py(pts[i - 1]) + " " + cx + " " + py(pts[i]) + " " + x1 + " " + py(pts[i]); }
  $("#line").setAttribute("d", dLine);
  $("#area").setAttribute("d", dLine + " L" + W + " " + H + " L0 " + H + " Z");
  const plot = $("#plot"), xh = $("#xh"), xhDot = $("#xhDot"), tip = $("#tip");
  on(plot, "pointermove", (e) => {
    const r = plot.getBoundingClientRect(), k = clamp((e.clientX - r.left) / r.width, 0, 1), idx = Math.round(k * (pts.length - 1));
    const x = (idx / (pts.length - 1)) * r.width, y = (1 - pts[idx] / maxV) * r.height;
    xh.style.left = x + "px"; xhDot.style.left = x + "px"; xhDot.style.top = y + "px";
    tip.style.left = clamp(x, 60, r.width - 60) + "px"; tip.style.top = y - 10 + "px";
    $("#tipV").textContent = money(pts[idx] * 10000);
    $("#tipD").textContent = idx === pts.length - 1 ? "Today" : "Day " + (idx + 1);
  });

  /* ---------- magnetic buttons (delegated, so new buttons work too) ---------- */
  if (fine && !reduce) {
    on(document, "pointermove", (e) => {
      const b = e.target.closest && e.target.closest(".mag");
      if (!b) return;
      const r = b.getBoundingClientRect(), dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      b.classList.add("mag-on"); b.style.setProperty("--tx", (dx * 6).toFixed(1) + "px"); b.style.setProperty("--ty", (dy * 5).toFixed(1) + "px");
    }, { passive: true });
    on(document, "pointerout", (e) => {
      const b = e.target.closest && e.target.closest(".mag");
      if (b && !b.contains(e.relatedTarget)) { b.classList.remove("mag-on"); b.style.setProperty("--tx", "0px"); b.style.setProperty("--ty", "0px"); }
    });
  }

  /* ---------- spotlight borders ---------- */
  if (fine) {
    on(root, "pointermove", (e) => {
      const t = e.target.closest && e.target.closest(".spot"); if (!t) return;
      const r = t.getBoundingClientRect(); t.style.setProperty("--mx", e.clientX - r.left + "px"); t.style.setProperty("--my", e.clientY - r.top + "px");
    }, { passive: true });
  }

  /* ---------- nav pill ---------- */
  const links = $("#links"), pillBg = $("#pillBg"), spyLinks = Array.from(links.querySelectorAll("[data-spy]"));
  let hoverLink = null, curSpy = "";
  const placePill = (a) => {
    if (!a) { pillBg.style.opacity = "0"; return; }
    pillBg.style.opacity = "1"; pillBg.style.width = a.offsetWidth + "px"; pillBg.style.transform = "translateX(" + a.offsetLeft + "px)";
  };
  spyLinks.forEach((a) => on(a, "pointerenter", () => { hoverLink = a; placePill(a); }));
  on(links, "pointerleave", () => { hoverLink = null; placePill(links.querySelector(".on")); });

  /* ---------- ticker scramble ---------- */
  const tickEl = $("#coinTicker"), finalT = tickEl.textContent || "$YOURHANDLE";
  let scrambled = false;
  const scramble = () => {
    if (reduce) { tickEl.textContent = finalT; return; }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", t0 = performance.now(), dur = 650;
    const step = (t) => {
      if (!alive) return;
      const k = (t - t0) / dur, n = Math.floor(clamp(k, 0, 1) * (finalT.length - 1)) + 1;
      let s = "$"; for (let i = 1; i < finalT.length; i++) s += i < n ? finalT[i] : chars[(Math.random() * chars.length) | 0];
      tickEl.textContent = s; if (k < 1) requestAnimationFrame(step); else tickEl.textContent = finalT;
    };
    requestAnimationFrame(step);
  };

  /* ---------- coin tilt ---------- */
  const tokVisual = $("#tokVisual");
  let tiltX = 0, tiltY = 0, tTX = 0, tTY = 0, tilting = false;
  const tiltLoop = () => {
    if (!alive) return;
    tiltX += (tTX - tiltX) * 0.1; tiltY += (tTY - tiltY) * 0.1; frame();
    if (Math.abs(tTX - tiltX) > 0.05 || Math.abs(tTY - tiltY) > 0.05) requestAnimationFrame(tiltLoop); else tilting = false;
  };
  if (fine && !reduce) {
    on(tokVisual, "pointermove", (e) => {
      const r = tokVisual.getBoundingClientRect();
      tTY = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5) * 24; tTX = -clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5) * 24;
      if (!tilting) { tilting = true; requestAnimationFrame(tiltLoop); }
    });
    on(tokVisual, "pointerleave", () => { tTX = 0; tTY = 0; if (!tilting) { tilting = true; requestAnimationFrame(tiltLoop); } });
  }

  /* ---------- scroll-linked frame ---------- */
  const progress = $("#progress"), nav = $("#nav"), hero = $("#heroInner");
  const orbs = $$("[data-par]");
  const tok = $("#tokenize"), cardX = $("#cardX"), cardCoin = $("#cardCoin"), coin = $("#coin"), stamp = $("#stamp"), live = $("#coinLive");
  const fields = $$(".tok-visual .field"), steps = $$(".tok-step"), stepsWrap = $("#tokSteps");
  const howCards = $$(".how-card"), howSec = $("#how");
  const footer = $("#footer"), wordmark = $("#wordmark"), launchSec = $("#launch");
  let stamped = false, ticking = false;
  function frame() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
    progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    nav.classList.toggle("scrolled", y > 12);

    if (!reduce) {
      const hp = clamp(y / (vh * 0.9), 0, 1);
      hero.style.transform = "translateY(" + hp * 80 + "px) scale(" + (1 - hp * 0.06) + ")";
      hero.style.opacity = String(1 - hp * 0.9);
      orbs.forEach((o) => { o.style.transform = "translateY(" + y * +o.getAttribute("data-par") + "px)"; });
      const fr = footer.getBoundingClientRect();
      wordmark.style.transform = "translateY(" + clamp((fr.top - vh) * 0.1, -80, 80).toFixed(1) + "px)";
    }

    const r = tok.getBoundingClientRect();
    const p = reduce ? 1 : clamp(-r.top / (r.height - vh), 0, 1);
    stepsWrap.style.setProperty("--p", p.toFixed(3));
    const idx = p < 0.34 ? 0 : p < 0.7 ? 1 : 2;
    steps.forEach((s, i) => { s.classList.toggle("on", i <= idx); s.classList.toggle("cur", i === idx); });
    const tx = ramp(p, 0.2, 0.48), tc = ramp(p, 0.32, 0.56);
    cardX.style.opacity = String(1 - tx);
    cardX.style.transform = "translate3d(" + -tx * 70 + "px," + tx * -34 + "px,0) rotate(" + -tx * 9 + "deg) scale(" + (1 - tx * 0.14) + ")";
    cardX.style.visibility = tx >= 1 ? "hidden" : "visible";
    cardCoin.style.opacity = String(tc);
    cardCoin.style.transform = "translate3d(0," + (1 - tc) * 70 + "px,0) scale(" + (0.92 + tc * 0.08) + ") rotateX(" + (tiltX * tc).toFixed(2) + "deg) rotateY(" + (tiltY * tc).toFixed(2) + "deg)";
    coin.style.transform = "rotateY(" + ((1 - ramp(p, 0.38, 0.64)) * 540 + tiltY * 0.8).toFixed(1) + "deg)";
    fields.forEach((f, i) => { const k = ramp(p, 0.48 + i * 0.06, 0.56 + i * 0.06); f.style.opacity = String(0.15 + k * 0.85); f.style.transform = "translateX(" + (1 - k) * -18 + "px)"; });
    const ks = ramp(p, 0.8, 0.9);
    stamp.style.opacity = String(ks);
    stamp.style.transform = "scale(" + (1.7 - ks * 0.7) + ") rotate(" + (1 - ks) * -16 + "deg)";
    live.style.opacity = String(0.3 + ramp(p, 0.84, 0.94) * 0.7);
    if (ks >= 1 && !stamped) { stamped = true; coin.classList.remove("shining"); void coin.offsetWidth; coin.classList.add("shining"); }
    if (ks < 0.5) stamped = false;
    if (p > 0.58 && !scrambled) { scrambled = true; scramble(); }
    if (p < 0.3) scrambled = false;

    const hr = howSec.getBoundingClientRect();
    const hpct = clamp((vh * 0.85 - hr.top) / (hr.height * 0.9), 0, 1);
    howCards.forEach((c, i) => c.classList.toggle("on", hpct > 0.25 + i * 0.18));

    let cur = "";
    ["tokenize", "explore", "how", "stats"].forEach((id) => { const el = root.querySelector("#" + id); if (el && el.getBoundingClientRect().top < vh * 0.45) cur = id; });
    if (launchSec.getBoundingClientRect().top < vh * 0.45) cur = "";
    if (cur !== curSpy) { curSpy = cur; spyLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("data-spy") === cur)); if (!hoverLink) placePill(links.querySelector(".on")); }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  on(window, "scroll", onScroll, { passive: true });
  on(window, "resize", () => { buildStrip(); onScroll(); });
  frame();

  /* ---------- pointer glow ---------- */
  const glow = $("#glow");
  if (!reduce && fine) {
    let gx = innerWidth / 2, gy = 200, gtx = gx, gty = gy, running = false;
    const loop = () => {
      if (!alive) return;
      gx += (gtx - gx) * 0.12; gy += (gty - gy) * 0.12; glow.style.transform = "translate3d(" + gx + "px," + gy + "px,0)";
      if (Math.abs(gtx - gx) > 0.5 || Math.abs(gty - gy) > 0.5) requestAnimationFrame(loop); else running = false;
    };
    on(window, "pointermove", (e) => { gtx = e.clientX; gty = e.clientY; glow.style.opacity = "1"; if (!running) { running = true; requestAnimationFrame(loop); } }, { passive: true });
    on(document, "pointerleave", () => { glow.style.opacity = "0"; });
  }

  /* ================= LAUNCH FLOW ================= */
  const ln = $("#ln"), lnMain = $("#lnMain"), lnPanel = $("#lnPanel"), pv = $("#pv"), lnBar = $("#lnBar");
  const stEls = $$(".ln-st");
  const navLaunch = $("#navLaunch");
  const L = { me: null, wallet: null, linked: false, buy: "0.5", reward: "creator", agreed: false, pending: null, busy: false, wanted: null };
  const xSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8zM16.7 19.2h1.7L7.4 4.7H5.6z"/></svg>';
  const okSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const noSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  let lastFocus = null;
  whenBridge(() => { $("#lnNet").innerHTML = '<span class="dot"></span>Solana ' + (B()?.cluster === "mainnet-beta" ? "mainnet" : "devnet"); });

  const errBox = (msg) => '<div class="err" role="alert">' + esc(msg) + "</div>";
  const errMsg = (e) => (e && e.message) || "Something went wrong. Try again.";
  function setStep(n) {
    stEls.forEach((el, i) => { el.classList.toggle("done", i < n || n === 4); el.classList.toggle("cur", i === n); });
    const span = stEls[stEls.length - 1].offsetTop - stEls[0].offsetTop;
    lnBar.style.height = (span * Math.min(n, 3)) / 3 + "px";
  }
  function view(html) {
    lnMain.innerHTML = '<div class="ln-view">' + html + "</div>";
    lnPanel.scrollTop = 0;
    const h = lnMain.querySelector(".ln-h");
    if (h) { h.id = "lnTitle"; h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  const pvEl = (id) => root.querySelector("#" + id);
  function pvSet(id, text) { const el = pvEl(id); el.textContent = text; el.classList.remove("sk", "fill-in"); void el.offsetWidth; el.classList.add("fill-in"); }
  function pvLoading(on) { ["pvName", "pvTick", "pvHandle", "pvBio", "pvImg"].forEach((id) => pvEl(id).classList.toggle("sk", on)); }
  function pvProfile(c) {
    const av = pvEl("pvAv");
    av.innerHTML = safeUrl(c.avatar) ? '<img src="' + safeUrl(c.avatar) + '" alt="" referrerpolicy="no-referrer">' : initials(c.name);
    pvSet("pvName", c.name); pvSet("pvTick", "$" + ticker(c.handle)); pvSet("pvHandle", "@" + c.handle);
    pvSet("pvBio", c.bio && c.bio.trim() ? c.bio : "Official coin of @" + c.handle); pvSet("pvImg", "X photo, 400×400");
    pvEl("pvFollow").textContent = compact(c.followers) + " followers";
  }
  function pvLive(on) { pv.classList.toggle("live", on); pvEl("pvState").innerHTML = on ? '<span class="dot"></span>Live on pump.fun' : "Draft"; }

  async function refreshMe() {
    try { L.me = await B().me(); } catch { L.me = { signedIn: false, config: { maxBuySol: 5 } }; }
    if (L.me.token && navLaunch) navLaunch.textContent = "View my coin";
    return L.me;
  }

  /* ----- step 1: X ----- */
  function sX() {
    setStep(0);
    const me = L.me;
    if (!me?.signedIn) {
      view('<span class="eyebrow">Step 1 of 4</span><h2 class="ln-h">Sign in with X</h2>' +
        '<p class="ln-sub">We read your name, handle, photo and bio to build your coin. We never post, follow or message anyone for you.</p>' +
        (L.wanted ? '<p class="ln-fine">Sign in with the X account @' + esc(L.wanted) + ".</p>" : "") +
        '<div class="ln-actions"><button class="btn btn-solid btn-wide mag" type="button" data-act="x">' + xSvg + "Continue with X</button></div>" +
        '<p class="ln-fine">By continuing you agree to the Terms and Risk notice.</p>');
      return;
    }
    const c = me.creator;
    pvProfile(c);
    const checks = (me.eligibility?.checks || []).map((r, i) =>
      '<div class="chk" style="animation-delay:' + i * 0.15 + 's"><i style="' + (r.ok ? "" : "background:rgba(251,113,133,.12);border-color:rgba(251,113,133,.4);color:var(--down)") + '">' + (r.ok ? okSvg : noSvg) + "</i>" + esc(r.label) + "</div>").join("");
    const ok = me.eligibility?.ok;
    view('<span class="eyebrow">Step 1 of 4</span><h2 class="ln-h">' + (ok ? "You’re eligible" : "This account can’t launch yet") + "</h2>" +
      '<p class="ln-sub">Signed in as @' + esc(c.handle) + ". " + (ok ? "Everything checks out." : "Fix the items below on X, then sign out and sign in again.") + "</p>" +
      '<div class="checks">' + checks + "</div>" +
      '<div class="ln-actions">' + (ok ? '<button class="btn btn-solid btn-wide mag" type="button" data-act="toWallet">Continue</button>' : "") +
      '<button class="ln-link" type="button" data-act="signout">Not you? Sign out</button></div>');
  }
  async function doX(btn) {
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Opening X…';
    pvLoading(true);
    try { await B().signInWithX(); } catch (e) { pvLoading(false); btn.disabled = false; btn.innerHTML = xSvg + "Continue with X"; btn.insertAdjacentHTML("afterend", errBox(errMsg(e))); }
  }

  /* ----- step 2: wallet ----- */
  function sWallet() {
    setStep(1);
    const ws = B().wallets(), mobileNoWallet = ws.some((w) => w.mobileApp) && !ws.some((w) => w.installed);
    const opts = ws.map((w) =>
      '<button class="opt" type="button" data-act="wallet" data-w="' + esc(w.name) + '"><span class="wl" style="background:#1a1a1a">' +
      (w.icon ? '<img src="' + esc(w.icon) + '" alt="">' : esc(w.name[0])) + "</span><span><b>" + esc(w.name) + "</b><small>" +
      (w.installed ? "Ready to connect" : w.mobileApp ? "Opens minted in the " + esc(w.name) + " app" : "Not installed") + '</small></span><span class="end">' + (w.installed ? '<span class="det">Detected</span>' : w.mobileApp ? "Open app" : "Install") +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></span></button>').join("");
    view('<span class="eyebrow">Step 2 of 4</span><h2 class="ln-h">Connect your Solana wallet</h2>' +
      '<p class="ln-sub">This wallet creates your coin and, unless you send them to holders, receives your creator fees. Choose carefully: it can’t be changed after launch.</p>' +
      (mobileNoWallet ? '<p class="mob">On a phone, wallets work inside their own app. Pick yours below: minted opens there and you sign in with X once more.</p>' : "") +
      '<div class="opts">' + opts + '</div><div id="wErr"></div><div class="ln-actions"><button class="ln-link" type="button" data-act="toX">Back</button></div>');
  }
  async function doWallet(btn) {
    if (L.busy) return; L.busy = true;
    const end = btn.querySelector(".end"), prev = end.innerHTML;
    end.innerHTML = '<span class="spin"></span>Connecting…';
    try {
      const w = await B().connectWallet(btn.getAttribute("data-w"));
      L.wallet = w; pvSet("pvWallet", w.short);
      if (L.me.wallet === w.address) { L.linked = true; sLinked(); return; }
      const message = await B().getLinkMessage(w.address);
      sProve(message);
    } catch (e) {
      end.innerHTML = prev;
      if (!e || e.code !== "redirecting") $("#wErr").innerHTML = errBox(errMsg(e));
    } finally { L.busy = false; }
  }
  function sProve(message) {
    const w = L.wallet, h = L.me.creator.handle;
    view('<span class="eyebrow">Step 2 of 4</span><h2 class="ln-h">Prove this wallet is yours</h2>' +
      '<p class="ln-sub">Sign a short message to link it to @' + esc(h) + ". It’s free and doesn’t move any SOL.</p>" +
      (L.me.wallet ? '<p class="ln-fine">This replaces the wallet you linked before.</p>' : "") +
      '<span class="chip" style="align-self:flex-start"><span class="dot"></span>' + esc(w.name) + " · " + esc(w.short) + "</span>" +
      '<div class="msg" id="linkMsg"></div><div id="sErr"></div>' +
      '<div class="ln-actions" id="sigRow"><button class="btn btn-solid btn-wide mag" type="button" data-act="sign">Sign message</button><button class="ln-link" type="button" data-act="toWallet">Use another wallet</button></div>');
    $("#linkMsg").textContent = message;
    L.message = message;
  }
  async function doSign(btn) {
    if (L.busy) return; L.busy = true;
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Waiting for ' + esc(L.wallet.name) + "…";
    try {
      await B().signAndLink(L.wallet.address, L.message);
      L.linked = true; L.me.wallet = L.wallet.address;
      sLinked();
    } catch (e) {
      btn.disabled = false; btn.textContent = "Sign message";
      $("#sErr").innerHTML = errBox(/reject|denied|cancel/i.test(errMsg(e)) ? "You cancelled the signature. Nothing was linked." : errMsg(e));
    } finally { L.busy = false; }
  }
  function sLinked() {
    setStep(1);
    view('<span class="eyebrow">Step 2 of 4</span><h2 class="ln-h">Wallet linked</h2>' +
      '<p class="ln-sub">' + esc(L.wallet.short) + " is linked to @" + esc(L.me.creator.handle) + ". This wallet will create your coin.</p>" +
      '<span class="okline"><i>' + okSvg + "</i>" + esc(L.wallet.name) + " · " + esc(L.wallet.short) + "</span>" +
      '<div class="ln-actions"><button class="btn btn-solid btn-wide mag" type="button" data-act="toReview">Continue</button><button class="ln-link" type="button" data-act="toWallet">Use another wallet</button></div>');
  }

  /* ----- step 3: review ----- */
  function sReview() {
    setStep(2); L.agreed = false;
    const c = L.me.creator, max = L.me.config.maxBuySol;
    const picks = ["0", "0.1", "0.5", "1", "2"].filter((v) => Number(v) <= max);
    view('<span class="eyebrow">Step 3 of 4</span><h2 class="ln-h">Review your coin</h2>' +
      '<p class="ln-sub">Name, ticker, photo and bio come from X and are locked. Your first buy is the only thing you set.</p>' +
      '<div class="buy"><label for="buyIn">First buy (optional)</label><div class="buy-in"><input id="buyIn" type="text" inputmode="decimal" value="' + esc(L.buy) + '" aria-describedby="buyHelp"><span>SOL</span></div>' +
      '<div class="qs">' + picks.map((v) => '<button class="q' + (v === L.buy ? " on" : "") + '" type="button" data-act="q" data-v="' + v + '">' + v + " SOL</button>").join("") + "</div>" +
      '<span class="ln-fine" id="buyHelp">Buy some of your own coin at launch. Max ' + max + " SOL. Shown publicly on your coin page.</span></div>" +
      '<div class="buy"><label>Creator rewards</label><div class="rw" role="radiogroup" aria-label="Creator rewards">' +
        '<button class="opt' + (L.reward === "creator" ? " on" : "") + '" type="button" role="radio" aria-checked="' + (L.reward === "creator") + '" data-act="rw" data-v="creator"><b>To me</b><small>pump.fun creator fees go to your wallet. Claim them anytime on pump.fun.</small></button>' +
        '<button class="opt' + (L.reward === "holders" ? " on" : "") + '" type="button" role="radio" aria-checked="' + (L.reward === "holders") + '" data-act="rw" data-v="holders"><b>To holders</b><small>pump.fun pays the creator fee to people holding your coin. You get none of it.</small></button>' +
        '</div><span class="ln-fine">Locked at launch and shown publicly on your coin page.</span></div>' +
      '<dl class="sum"><div><dt>Coin</dt><dd>' + esc(c.name) + " · $" + ticker(c.handle) + '</dd></div><div><dt>First buy</dt><dd id="sumBuy">' + esc(L.buy) + ' SOL</dd></div><div><dt>Creator rewards</dt><dd id="sumRw">' + (L.reward === "holders" ? "To holders" : "To me") + "</dd></div><div><dt>Network and pump.fun fees</dt><dd>Shown in wallet</dd></div><div><dt>Platform fee</dt><dd>0 SOL</dd></div></dl>" +
      '<div class="warn"><strong>This is your only launch</strong><p>Each X account and each wallet can launch one coin, ever. After you sign, @' + esc(c.handle) + " can never launch another coin here.</p>" +
      '<label class="agree" for="agree"><input id="agree" type="checkbox">I understand this can’t be undone</label></div><div id="rErr"></div>' +
      '<div class="ln-actions"><button class="btn btn-solid btn-wide mag" type="button" data-act="launch" id="goLaunch" disabled>Sign and launch on pump.fun</button><button class="ln-link" type="button" data-act="toWallet">Back</button></div>');
    const inp = $("#buyIn");
    inp.addEventListener("input", () => {
      let v = inp.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
      if (Number(v) > max) v = String(max);
      inp.value = v; L.buy = v === "" ? "0" : v;
      $("#sumBuy").textContent = L.buy + " SOL"; pvEl("pvBuy").textContent = L.buy + " SOL";
      $$(".q").forEach((b) => b.classList.toggle("on", b.getAttribute("data-v") === L.buy));
    });
    $("#agree").addEventListener("change", (e) => { L.agreed = e.target.checked; $("#goLaunch").disabled = !L.agreed; });
  }

  /* ----- step 4: launch ----- */
  const TASKS = () => ["Uploading photo and metadata", "Building pump.fun transaction", "Approve in " + (L.wallet?.name || "your wallet"), "Confirming on Solana", "Verifying creator on-chain"];
  function sLaunch() {
    setStep(3);
    view('<span class="eyebrow">Step 4 of 4</span><h2 class="ln-h">Launching $' + ticker(L.me.creator.handle) + "</h2>" +
      '<p class="ln-sub">Keep this window open. It usually takes under a minute.</p>' +
      '<div class="tasks">' + TASKS().map((x, i) => '<div class="task" data-i="' + i + '"><span class="ti"></span>' + esc(x) + "<small></small></div>").join("") + '</div><div id="lSlot"></div>');
    runLaunch();
  }
  function task(i, state, note?) {
    const el = lnMain.querySelector('.task[data-i="' + i + '"]'); if (!el) return;
    el.className = "task " + state;
    el.querySelector(".ti").innerHTML = state === "run" ? '<span class="spin"></span>' : state === "ok" ? okSvg : state === "bad" ? "!" : "";
    if (note !== undefined) el.querySelector("small").textContent = note;
  }
  async function runLaunch() {
    const t0 = performance.now();
    try {
      task(0, "run"); task(1, "run");
      L.pending = await B().build(Number(L.buy) || 0, L.reward);
      task(0, "ok", "IPFS"); task(1, "ok", "create_v2");
      await approveAndFinish(t0);
    } catch (e) {
      task(0, "bad"); task(1, "bad");
      launchError(e);
    }
  }
  async function approveAndFinish(t0) {
    const p = L.pending;
    task(2, "run", "check your wallet");
    $("#lSlot").innerHTML = '<p class="ln-fine">Your wallet will show the exact transaction: creating $' + ticker(L.me.creator.handle) + (Number(L.buy) > 0 ? " and buying " + esc(L.buy) + " SOL of it" : "") + ".</p>";
    let sig;
    try { sig = await B().send(p.tx); }
    catch (e) {
      if (e && e.code === "rejected") { task(2, "bad", "rejected"); $("#lSlot").innerHTML = errBox("You rejected the transaction. Nothing was sent and no SOL moved.") + '<div class="ln-actions"><button class="btn btn-solid btn-wide" type="button" data-act="retry">Try again</button><button class="ln-link" type="button" data-act="toReview">Back to review</button></div>'; return; }
      task(2, "bad"); return launchError(e);
    }
    $("#lSlot").innerHTML = "";
    task(2, "ok", "signed"); task(3, "run");
    try {
      await B().waitForConfirmation(sig, p.blockhash, p.lastValidBlockHeight);
      task(3, "ok", "confirmed"); task(4, "run");
      const token = await B().confirm(p.launchId, sig);
      task(4, "ok", ((performance.now() - t0) / 1000).toFixed(1) + "s");
      await refreshMe();
      later(() => sDone(token), 500);
    } catch (e) { task(3, "bad"); launchError(e); }
  }
  function launchError(e) {
    const code = e && e.code;
    if (code === "already_launched") { refreshMe().then(sAlready); return; }
    const retry = code !== "in_progress";
    $("#lSlot").innerHTML = errBox(errMsg(e)) + '<div class="ln-actions">' + (retry ? '<button class="btn btn-solid btn-wide" type="button" data-act="toReview">Back to review</button>' : '<button class="btn btn-solid btn-wide" type="button" data-act="close">Close</button>') + "</div>";
  }
  function sDone(token) {
    setStep(4); pvLive(true);
    const h = L.me.creator.handle, t = "$" + esc(token.symbol), m = token.mint, short = m.slice(0, 4) + "…" + m.slice(-8);
    const text = encodeURIComponent("I just launched my verified coin $" + token.symbol + " on minted. The only official one. " + location.origin + "/c/" + h);
    view('<span class="eyebrow">Launched</span><h2 class="ln-h">You’re live, @' + esc(h) + ".</h2>" +
      '<p class="ln-sub">' + t + " is trading on pump.fun and listed on minted with your Verified badge.</p>" +
      '<div style="display:flex;flex-direction:column;gap:8px"><span class="ln-fine">Contract address</span><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip" id="mintTxt" style="user-select:all">' + esc(short) + '</span><button class="btn btn-ghost" type="button" data-act="copy" data-mint="' + esc(m) + '" style="min-height:38px">Copy</button></div></div>' +
      '<div class="ln-actions"><a class="btn btn-solid btn-wide mag" href="https://x.com/intent/post?text=' + text + '" target="_blank" rel="noopener">' + xSvg + 'Share on X</a><a class="btn btn-ghost btn-wide" href="/c/' + encodeURIComponent(h) + '">View my coin page</a><a class="ln-link" href="' + safeUrl(token.url) + '" target="_blank" rel="noopener">Open on pump.fun</a></div>' +
      '<p class="ln-fine">Tip: pin your post so fans find the real coin.</p>');
    burst();
    loadTokens();
  }
  function sAlready() {
    setStep(4); pvLive(true);
    const tk = L.me.token, c = L.me.creator;
    if (c) pvProfile(c);
    view('<span class="eyebrow">One coin per account</span><h2 class="ln-h">You’ve already launched</h2>' +
      '<p class="ln-sub">@' + esc(c?.handle) + " launched $" + esc(tk?.symbol) + " on pump.fun. Each X account gets one coin, so there’s nothing more to launch here.</p>" +
      '<div class="ln-actions"><a class="btn btn-solid btn-wide mag" href="/c/' + encodeURIComponent(c?.handle || "") + '">View my coin page</a><button class="ln-link" type="button" data-act="close">Close</button></div>');
  }
  function burst() {
    if (reduce) return;
    const cv = document.createElement("canvas"); cv.className = "burst"; lnPanel.appendChild(cv);
    const r = lnPanel.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = lnPanel.scrollHeight * dpr; cv.style.height = lnPanel.scrollHeight + "px";
    const x = cv.getContext("2d"); x.scale(dpr, dpr);
    const src = pv.getBoundingClientRect(), ox = src.left - r.left + 48, oy = src.top - r.top + lnPanel.scrollTop + 52;
    const cols = ["#ffffff", "#a5f3fc", "#c4b5fd", "#34d399"], ps = [];
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6; ps.push({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: 1 + Math.random() * 2.4, c: cols[i % 4], l: 1 }); }
    const tickB = () => {
      x.clearRect(0, 0, cv.width, cv.height); let any = false;
      ps.forEach((p) => { p.vy += 0.12; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.l -= 0.012; if (p.l > 0) { any = true; x.globalAlpha = p.l; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.r, 0, Math.PI * 2); x.fill(); } });
      if (any && alive) requestAnimationFrame(tickB); else cv.remove();
    };
    requestAnimationFrame(tickB);
  }

  /* ----- open / close ----- */
  async function openLaunch(handle?) {
    lastFocus = document.activeElement;
    if (handle) L.wanted = handle;
    ln.classList.add("open"); ln.setAttribute("aria-hidden", "false");
    if (lenis) lenis.stop(); document.documentElement.style.overflow = "hidden";
    lnMain.innerHTML = '<div class="ln-view" style="align-items:center;justify-content:center"><span class="spin" style="width:22px;height:22px"></span></div>';
    await refreshMe();
    if (L.me.token) return sAlready();
    pvLive(false);
    if (!L.me.signedIn) { pvLoading(false); return sX(); }
    pvProfile(L.me.creator);
    if (L.linked && L.wallet) return sReview();
    sX();
  }
  function closeLaunch() {
    ln.classList.remove("open"); ln.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start(); document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  on(document, "click", (e) => {
    const t = e.target.closest && e.target.closest("[data-launch]");
    if (t && root.contains(t)) { e.preventDefault(); e.stopPropagation(); openLaunch(t.getAttribute("data-handle")); }
  }, true);
  on(ln, "click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.getAttribute("data-act");
    if (a === "close") closeLaunch();
    else if (a === "x") doX(b);
    else if (a === "signout") { await B().signOut(); L.me = null; L.wallet = null; L.linked = false; await refreshMe(); pvLoading(false); pvEl("pvAv").textContent = "?"; sX(); }
    else if (a === "toX") sX();
    else if (a === "toWallet") { L.linked = false; sWallet(); }
    else if (a === "wallet") doWallet(b);
    else if (a === "sign") doSign(b);
    else if (a === "toReview") sReview();
    else if (a === "rw") {
      L.reward = b.getAttribute("data-v") === "holders" ? "holders" : "creator";
      $$(".rw .opt").forEach((o) => { const on = o.getAttribute("data-v") === L.reward; o.classList.toggle("on", on); o.setAttribute("aria-checked", String(on)); });
      $("#sumRw").textContent = L.reward === "holders" ? "To holders" : "To me";
      pvEl("pvRw").textContent = L.reward === "holders" ? "To holders" : "To me";
    }
    else if (a === "q") { const inp = $("#buyIn"); inp.value = b.getAttribute("data-v"); inp.dispatchEvent(new Event("input")); }
    else if (a === "launch") { if (L.agreed) sLaunch(); }
    else if (a === "retry") { $("#lSlot").innerHTML = ""; approveAndFinish(performance.now()); }
    else if (a === "copy") {
      const m = b.getAttribute("data-mint");
      try { await navigator.clipboard.writeText(m); b.textContent = "Copied"; later(() => { b.textContent = "Copy"; }, 1600); }
      catch { const r = document.createRange(); r.selectNodeContents($("#mintTxt")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    }
    else if (a === "finish") { closeLaunch(); later(() => scrollToEl($("#explore")), 150); }
  });
  on(document, "keydown", (e) => {
    if (!ln.classList.contains("open")) return;
    if (e.key === "Escape") { closeLaunch(); return; }
    if (e.key === "Tab") {
      const f = lnPanel.querySelectorAll('button:not([disabled]), a[href], input, [tabindex="0"]'); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Coming back from X sign-in (?launch=1): reopen the panel where the user left off.
  const params = new URLSearchParams(location.search);
  if (params.get("launch") === "1") {
    params.delete("launch");
    history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : "") + location.hash);
    whenBridge(() => later(() => openLaunch(), 300));
  } else {
    whenBridge(refreshMe);
  }

  /* ---------- hero in on load ---------- */
  requestAnimationFrame(() => { $$(".hero [data-reveal], .h1").forEach((el) => el.classList.add("in")); });

  return () => { alive = false; cleanups.forEach((fn) => { try { fn(); } catch {} }); root.classList.remove("anim"); document.documentElement.style.overflow = ""; };
}
