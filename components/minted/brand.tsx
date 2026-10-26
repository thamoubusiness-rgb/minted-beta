import { useId } from "react";

// NAMA brand mark: the neon N. One smooth centreline, stroked with round caps and joins.
const N = "M170,330 L170,190 C170,128 214,118 240,160 C256,186 270,212 282,238 C296,268 306,300 324,306 C336,310 340,298 340,284 L340,144";
const W = 48;

/**
 * The official neon-outline N. `edge` thickens the lime rim for small sizes (nav, panel),
 * so it stays crisp where the full-size rim would be thinner than a pixel.
 */
export function NamaMark({ size = 34, edge = 18, glow = true }: { size?: number; edge?: number; glow?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="128 92 254 270" aria-hidden="true" className="nama-mark">
      <defs>
        <linearGradient id={`n${id}`} gradientUnits="userSpaceOnUse" x1="150" y1="110" x2="350" y2="350">
          <stop offset="0" stopColor="#E4FF8F" />
          <stop offset=".5" stopColor="#C6FF34" />
          <stop offset="1" stopColor="#9EEA10" />
        </linearGradient>
        <linearGradient id={`f${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="360">
          <stop offset="0" stopColor="#1E211B" />
          <stop offset="1" stopColor="#121410" />
        </linearGradient>
        {glow ? (
          <filter id={`g${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b" />
            <feFlood floodColor="#C6FF34" floodOpacity=".55" />
            <feComposite in2="b" operator="in" result="g" />
            <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ) : null}
      </defs>
      <path d={N} fill="none" stroke={`url(#n${id})`} strokeWidth={W + edge} strokeLinecap="round" strokeLinejoin="round" filter={glow ? `url(#g${id})` : undefined} />
      <path d={N} fill="none" stroke={`url(#f${id})`} strokeWidth={W - 2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark + NAMA wordmark, used in the nav, footer and launch panel. */
export function NamaLogo({ size = 30 }: { size?: number }) {
  return (
    <>
      <NamaMark size={size} />
      <span className="logo-word">NAMA</span>
    </>
  );
}
