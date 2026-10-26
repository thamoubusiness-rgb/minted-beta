"use client";

import { useEffect, type RefObject } from "react";

// Shared motion for inner pages (coin page, dashboard): the same reveal, count-up and spotlight
// behaviour as the home page. Respects reduced motion.
export const fmtNum = (v: number, f: string | null) =>
  f === "money" ? (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${Math.round(v)}`)
  : f === "sol" ? `${v.toFixed(v < 1 ? 3 : 2)} SOL`
  : f === "pct" ? `${v.toFixed(2)}%`
  : f === "compact" ? (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(Math.round(v)))
  : Math.round(v).toLocaleString("en-US");

export function countUp(el: HTMLElement, reduce: boolean) {
  const to = Number(el.dataset.count), f = el.dataset.fmt ?? null;
  if (!Number.isFinite(to)) return;
  if (reduce) { el.textContent = fmtNum(to, f); return; }
  const t0 = performance.now();
  const step = (t: number) => {
    let k = Math.min(1, (t - t0) / 1400);
    k = 1 - Math.pow(1 - k, 3);
    el.textContent = fmtNum(to * k, f);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Wires reveals ([data-reveal]), count-ups ([data-count]) and spotlight borders (.spot) under `root`. */
export function useAlive(rootRef: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && "IntersectionObserver" in window) root.classList.add("anim");

    const seen = new WeakSet<Element>();
    const io = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting || seen.has(en.target)) return;
            seen.add(en.target);
            en.target.classList.add("in");
            if ((en.target as HTMLElement).dataset.count !== undefined) countUp(en.target as HTMLElement, reduce);
            io?.unobserve(en.target);
          });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 })
      : null;
    const scan = () => root.querySelectorAll("[data-reveal]:not(.in), [data-count]:not(.in)").forEach((el) => {
      if (io) io.observe(el); else { el.classList.add("in"); if ((el as HTMLElement).dataset.count !== undefined) countUp(el as HTMLElement, true); }
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });

    const onMove = (e: PointerEvent) => {
      const s = (e.target as Element)?.closest?.(".spot") as HTMLElement | null;
      if (!s) return;
      const r = s.getBoundingClientRect();
      s.style.setProperty("--mx", `${e.clientX - r.left}px`);
      s.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    root.addEventListener("pointermove", onMove);
    return () => { io?.disconnect(); mo.disconnect(); root.removeEventListener("pointermove", onMove); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
