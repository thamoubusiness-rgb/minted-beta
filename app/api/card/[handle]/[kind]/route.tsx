import { ImageResponse } from "next/og";
import { getCoin } from "@/lib/coin";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const revalidate = 300;

const LIME = "#C6FF34";
const N_PATH = "M170,330 L170,190 C170,128 214,118 240,160 C256,186 270,212 282,238 C296,268 306,300 324,306 C336,310 340,298 340,284 L340,144";
const markSvg = (size: number) =>
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="128 92 254 270" width="${size}" height="${size}">` +
      `<path d="${N_PATH}" fill="none" stroke="${LIME}" stroke-width="66" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${N_PATH}" fill="none" stroke="#151812" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  ).toString("base64");

const money = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`);
const host = () => config.siteUrl.replace(/^https?:\/\//, "");

/**
 * Share-kit images for X:  launch | 100k | 1m (milestones only once reached) | badge.
 * Rendered from live data, so a card can't claim a milestone the coin hasn't hit.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ handle: string; kind: string }> }) {
  const { handle, kind } = await ctx.params;
  const coin = await getCoin(handle);
  if (!coin) return new Response("Not found", { status: 404 });

  const milestone = kind === "100k" ? 100_000 : kind === "1m" ? 1_000_000 : null;
  if (milestone && (coin.marketCapUsd ?? 0) < milestone) return new Response("Milestone not reached yet", { status: 403 });

  const avatar = coin.avatar || coin.image;
  const bg = { background: "radial-gradient(ellipse at 50% 40%, #13170c 0%, #050505 70%)" };

  if (kind === "badge") {
    return new ImageResponse(
      (
        <div style={{ ...bg, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
          <img src={markSvg(120)} width={120} height={120} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: LIME, fontSize: 30, letterSpacing: 6 }}>VERIFIED ON NAMA</div>
            <div style={{ color: "#fff", fontSize: 58, fontWeight: 700 }}>{`$${coin.symbol}`}</div>
            <div style={{ color: "#9ea398", fontSize: 26 }}>{`${host()}/c/${coin.handle}`}</div>
          </div>
        </div>
      ),
      { width: 1000, height: 300 }
    );
  }

  const headline = milestone ? `${money(milestone)} market cap` : "Just launched on NAMA";
  const sub = milestone ? `$${coin.symbol} just crossed ${money(milestone)}.` : `The only verified coin of @${coin.handle}.`;

  return new ImageResponse(
    (
      <div style={{ ...bg, width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 64, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={markSvg(52)} width={52} height={52} alt="" />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>NAMA</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: LIME, color: "#0a0a0a", fontSize: 24, fontWeight: 700 }}>
            Verified creator
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 70 }}>
          <div style={{ display: "flex", width: 210, height: 210, borderRadius: 999, padding: 7, background: `linear-gradient(135deg, #E4FF8F, ${LIME}, #6fa800)`, boxShadow: `0 0 70px rgba(198,255,52,.35)` }}>
            {avatar ? <img src={avatar} width={196} height={196} style={{ borderRadius: 999 }} alt="" /> : <div style={{ display: "flex", width: 196, height: 196, borderRadius: 999, background: "#1b1f14" }} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 34, color: "#b9bdb2" }}>{`${coin.name} · @${coin.handle}`}</div>
            <div style={{ fontSize: 104, fontWeight: 800, color: LIME, letterSpacing: -2, lineHeight: 1 }}>{`$${coin.symbol}`}</div>
            <div style={{ fontSize: 46, fontWeight: 700, marginTop: 10 }}>{headline}</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "auto", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 28, color: "#d7dbd0" }}>{sub}</div>
            <div style={{ fontSize: 22, color: "#7d8277" }}>{`CA ${coin.mint}`}</div>
          </div>
          <div style={{ fontSize: 26, color: LIME }}>{`${host()}/c/${coin.handle}`}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 675, headers: { "Cache-Control": "public, s-maxage=300" } }
  );
}
